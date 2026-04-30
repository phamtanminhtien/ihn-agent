# IHN Agent — Architecture Design

> A terminal AI agent built with TypeScript and a pnpm monorepo.

---

## Table of Contents

1. [Overview](#overview)
2. [Goals & Non-Goals](#goals--non-goals)
3. [Monorepo Structure](#monorepo-structure)
4. [Package Responsibilities](#package-responsibilities)
5. [Core Architecture](#core-architecture)
   - [Agent Loop](#agent-loop)
   - [Tool System](#tool-system)
   - [Context & Memory](#context--memory)
   - [LLM Provider Abstraction](#llm-provider-abstraction)
6. [CLI Architecture](#cli-architecture)
7. [Configuration](#configuration)
8. [Data Flow](#data-flow)
9. [Advanced Behaviours](#advanced-behaviours)
   - [Sequential Tool Execution](#sequential-tool-execution)
   - [Tool Error Handling](#tool-error-handling)
   - [Loop Guard](#loop-guard)
   - [Retry Strategy](#retry-strategy)
   - [Tool Caching](#tool-caching)
   - [Event System](#event-system)
   - [UX: Interrupt & Display Modes](#ux-interrupt--display-modes)
10. [Key Design Decisions](#key-design-decisions)
11. [Directory Layout (Target)](#directory-layout-target)
12. [Extension Points](#extension-points)
13. [Roadmap](#roadmap)
14. [Tech Stack Summary](#tech-stack-summary)

---

## Overview

**IHN Agent** is a CLI-based AI coding assistant. It gives an LLM the ability to understand, navigate, edit, and reason about a local codebase through a structured **tool-use loop** — all from the terminal.

The user types natural-language instructions; the agent executes tool calls (read file, run command, write file, search …) iteratively until the task is complete, then summarises its work.

---

## Goals & Non-Goals

### Goals

- Interactive terminal REPL powered by a large language model
- Structured tool-use loop (the agent calls tools, observes results, reasons, repeats)
- Provider-agnostic LLM interface (Anthropic, OpenAI, Gemini, …)
- Extensible tool registry — any tool can be added without touching core loop logic
- Streaming responses for real-time feedback
- Context window management (conversation history trimming / summarisation)
- Safe sandboxed command execution with user confirmation

### Non-Goals

- GUI / web interface (CLI-first; web may come later as a separate app)
- Training or fine-tuning models
- Cloud deployment of the agent itself
- Multi-agent orchestration (v1 is single-agent)

---

## Monorepo Structure

```
ihn-agent/                          ← workspace root
├── apps/
│   └── cli/                        ← @ihn-agent/cli  (entry point for users)
├── packages/
│   ├── core/                       ← @ihn-agent/core (agent loop, tools, LLM)
│   ├── tools/                      ← @ihn-agent/tools (built-in tool implementations)
│   ├── providers/                  ← @ihn-agent/providers (LLM adapter layer)
│   ├── memory/                     ← @ihn-agent/memory (persistent & working memory)
│   └── schema/                     ← @ihn-agent/schema (shared JSON schemas & types)
├── docs/
│   └── ARCHITECTURE.md             ← this file
├── pnpm-workspace.yaml
└── package.json
```

The monorepo is managed with **pnpm workspaces**. Internal packages reference each other via `workspace:*`.

---

## Package Responsibilities

| Package              | Name                   | Role                                                             |
| -------------------- | ---------------------- | ---------------------------------------------------------------- |
| `apps/cli`           | `@ihn-agent/cli`       | Terminal UI (Ink/React), user I/O, keyboard handling             |
| `packages/core`      | `@ihn-agent/core`      | Agent loop, conversation state, tool dispatch, streaming         |
| `packages/tools`     | `@ihn-agent/tools`     | Concrete tool implementations (fs, shell, search, …)             |
| `packages/providers` | `@ihn-agent/providers` | LLM provider adapters (Anthropic, OpenAI, Gemini)                |
| `packages/memory`    | `@ihn-agent/memory`    | Working memory, persistent session history, memory store         |
| `packages/schema`    | `@ihn-agent/schema`    | Shared JSON Schema definitions, Zod validators, TypeScript types |

Dependencies flow **downward only**: `cli → core → tools, providers, memory, schema`.

---

## Core Architecture

### Agent Loop

The heart of the system is a **ReAct-style loop** (Reason → Act → Observe → repeat).

```
┌─────────────────────────────────────────────────────────┐
│                        Agent Loop                       │
│                                                         │
│  User Message                                           │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────┐    tool_calls    ┌──────────────────────┐  │
│  │  LLM    │ ──────────────►  │   Tool Dispatcher    │  │
│  │ (stream)│                  │  (Tool Registry)     │  │
│  └────┬────┘ ◄─────────────── └──────────────────────┘  │
│       │      tool_results                               │
│       │                                                 │
│  is tool_stop?                                          │
│    ├── YES → return final text to CLI                   │
│    └── NO  → continue loop                              │
└─────────────────────────────────────────────────────────┘
```

**Key classes in `@ihn-agent/core`:**

```
core/src/
├── agent.ts           ← Agent class — orchestrates the loop
├── loop.ts            ← AgentLoop — single iteration logic
├── conversation.ts    ← ConversationHistory — manages messages[]
├── tool-dispatcher.ts ← ToolDispatcher — routes tool calls to implementations
├── tool-registry.ts   ← ToolRegistry — registers & looks up tools
├── streaming.ts       ← StreamingHandler — consumes LLM stream chunks
└── index.ts           ← public API surface
```

**`Agent.run(userMessage)` pseudocode:**

```typescript
async run(userMessage: string): AsyncGenerator<StreamChunk> {
  this.conversation.addUser(userMessage);
  this.loopGuard.reset();

  while (true) {
    // 1. Guard: abort if loop count or repeated-tool pattern exceeded
    this.loopGuard.check();                               // throws if stuck

    // 2. Call LLM (with retry on transient errors)
    const stream = await withRetry(() =>
      this.provider.streamChat(this.conversation.messages, this.tools)
    );

    for await (const chunk of stream) {
      if (chunk.type === 'text')      yield chunk;        // stream text to CLI
      if (chunk.type === 'tool_use')  yield chunk;        // show pending tool call
    }

    const response = stream.finalMessage();
    this.conversation.addAssistant(response);

    if (response.stopReason === 'end_turn') break;        // done

    // 3. Execute tool calls SEQUENTIALLY (not in parallel)
    //    Each result is fed back before the next tool runs.
    const toolResults: ToolResult[] = [];
    for (const call of response.toolCalls) {
      const result = await this.dispatcher.dispatchOne(call);
      toolResults.push(result);
    }
    this.conversation.addToolResults(toolResults);
  }
}
```

---

### Tool System

Tools follow a **declarative schema + metadata** pattern.

```typescript
// packages/tools/src/types.ts
export type RiskLevel = 'safe' | 'low' | 'medium' | 'high';

export interface ToolMetadata {
  requiresConfirmation: boolean; // pause loop and ask user before executing
  riskLevel: RiskLevel; // used for tiered approval UX
  cacheable: boolean; // results can be cached keyed on input
  retryable: boolean; // safe to retry on transient failure
  timeout?: number; // ms before the tool call is aborted
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: JSONSchema; // sent to LLM + used for validation
  metadata: ToolMetadata;
  execute(input: TInput, ctx: ToolContext): Promise<TOutput>;
}

export interface ToolContext {
  workingMemory: WorkingMemory; // shared state across tool calls
  signal: AbortSignal; // cancelled on Ctrl+C
}
```

**Built-in tools** (in `@ihn-agent/tools`):

| Tool           | Name            | Risk   | Confirm | Cacheable |
| -------------- | --------------- | ------ | ------- | --------- |
| Read File      | `read_file`     | safe   | no      | ✅        |
| List Directory | `list_dir`      | safe   | no      | ✅        |
| Grep Search    | `grep_search`   | safe   | no      | ✅        |
| Web Search     | `web_search`    | low    | no      | ✅        |
| Edit File      | `edit_file`     | medium | no      | ❌        |
| Write File     | `write_file`    | medium | yes     | ❌        |
| Run Command    | `run_command`   | high   | yes     | ❌        |
| Task Complete  | `task_complete` | safe   | no      | ❌        |

**Risk level → approval behaviour:**

| Risk Level | Behaviour                                    |
| ---------- | -------------------------------------------- |
| `safe`     | Auto-execute, no prompt                      |
| `low`      | Auto-execute unless `autoApprove: false`     |
| `medium`   | Prompt unless in `allowedCommands` whitelist |
| `high`     | Always prompt, never auto-approve            |

**ToolRegistry** acts as a simple map:

```typescript
class ToolRegistry {
  private tools = new Map<string, Tool>();
  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  getSchemas(): ToolSchema[] {
    return [...this.tools.values()].map((t) => t.schema);
  }
}
```

---

### Context & Memory

Context management is critical for long sessions and has two components: **ConversationHistory** (what goes to the LLM) and **WorkingMemory** (ephemeral session state). Persistent cross-session memory is handled by `@ihn-agent/memory`.

#### ConversationHistory

```
ConversationHistory
  ├── messages: Message[]           ← full in-memory history
  ├── pinnedMessages: Set<id>       ← never trimmed (system prompt, user goal)
  ├── tokenCounter                  ← estimates token usage per message
  ├── trim()                        ← trims unpinned messages when near limit
  └── summarise()                   ← LLM-based compaction of oldest segment
```

**Priority / Pinning strategy:**

1. `system` role messages and the **initial user task** are always pinned — they are never trimmed.
2. `tool_result` messages for the **current turn** are always kept.
3. Older assistant + tool messages are candidates for trimming (oldest first).
4. When token usage exceeds 80 % of `maxContextTokens`, a summarisation pass condenses the trimmed segment into a single `summary` message before dropping originals.

#### WorkingMemory

`WorkingMemory` is **not** sent to the LLM. It is in-process state shared across tool calls within one session. It lives in `@ihn-agent/memory`.

```typescript
// packages/memory/src/working-memory.ts
export interface WorkingMemory {
  plan: string[]; // high-level steps the agent intends to take
  openFiles: string[]; // files currently "in focus"
  variables: Record<string, unknown>; // key-value scratch space for tools
  completedSteps: string[]; // steps marked done (for loop-guard awareness)
}
```

Tools read/write `WorkingMemory` via the `ToolContext` they receive on each `execute()` call.

#### MemoryStore

`MemoryStore` handles **cross-session persistence** and lives in `@ihn-agent/memory`. It reads/writes `~/.ihn/history.jsonl` and injects a compact summary into the system prompt at agent startup.

```typescript
// packages/memory/src/memory-store.ts
export interface MemoryStore {
  load(): Promise<MemoryEntry[]>;
  append(entry: MemoryEntry): Promise<void>;
  summarise(): Promise<string>; // condenses history for system-prompt injection
  clear(): Promise<void>;
}
```

---

### Schema Package

`@ihn-agent/schema` is the **single source of truth** for all shared types, JSON Schema definitions, and Zod validators used across packages. Keeping schemas in their own package prevents circular dependencies and allows any package to import types without pulling in runtime logic.

```
packages/schema/src/
├── tool.ts          ← ToolSchema, ToolCall, ToolResult definitions
├── message.ts       ← Message, Role, StreamChunk types
├── config.ts        ← AgentConfig JSON Schema + Zod validator
├── memory.ts        ← MemoryEntry, WorkingMemory interfaces
└── index.ts         ← re-exports everything
```

All other packages import shared types from `@ihn-agent/schema`:

```typescript
import type { ToolSchema, Message, AgentConfig } from '@ihn-agent/schema';
```

---

### LLM Provider Abstraction

All LLM calls go through a **provider interface**, making it trivial to swap models.

```typescript
// providers/src/types.ts
export interface LLMProvider {
  streamChat(
    messages: Message[],
    tools: ToolSchema[],
    options?: ChatOptions
  ): AsyncIterable<StreamChunk>;
}
```

**Adapters** (in `@ihn-agent/providers`):

```
providers/src/
├── anthropic.ts    ← Claude models via @anthropic-ai/sdk
├── openai.ts       ← GPT-4o / o3 via openai SDK
├── gemini.ts       ← Gemini 2.x via @google/generative-ai
└── index.ts        ← factory function: createProvider(name, config)
```

Provider is selected at **runtime** via an environment variable or config file:

```bash
IHN_PROVIDER=anthropic
IHN_MODEL=claude-opus-4-5
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Configuration

Configuration is resolved from **two sources** and deep-merged at startup, so users can commit project-level settings to a JSON file while keeping secrets in the environment.

### Sources & Precedence

```
Highest priority  ──►  Environment Variables   (process.env.*)
                        ↓  override
Lowest priority   ──►  JSON Config File        (~/.ihn/config.json  or  .ihn/config.json in project root)
```

If the same key appears in both sources, the **environment variable wins**.

### Config File Location

The loader searches for the JSON file in this order (first match wins):

1. Path from `IHN_CONFIG` env var (absolute or relative to cwd)
2. `.ihn/config.json` in the **current working directory** (project-level)
3. `~/.ihn/config.json` in the **user's home directory** (global default)

#### `~/.ihn/` Directory Layout

Using a dedicated directory (instead of a single dotfile) keeps `~/` clean and leaves room for future artefacts:

```
~/.ihn/
├── config.json      ← user-global configuration
├── history.jsonl    ← (future) persistent conversation history
├── cache/           ← (future) cached LLM responses / embeddings
└── plugins/         ← (future) user-installed tool plugins
```

The directory is created automatically on first run if it does not exist.

### Config Schema

The `AgentConfig` interface and its JSON Schema are defined in `@ihn-agent/schema` and consumed by `ConfigLoader` in `@ihn-agent/core`.

```typescript
// packages/schema/src/config.ts
export interface AgentConfig {
  // LLM provider
  provider: 'anthropic' | 'openai' | 'gemini'; // default: 'anthropic'
  model: string; // e.g. 'claude-opus-4-5'
  apiKey: string; // required — never commit this

  // Context
  maxContextTokens: number; // default: 100_000
  maxTurns: number; // default: 50 (safety limit on loop iterations)

  // Tool behaviour
  autoApprove: boolean; // default: false — skip confirmation prompts
  allowedCommands: string[]; // shell commands that skip the approval gate

  // UI
  streamOutput: boolean; // default: true
  theme: 'dark' | 'light'; // default: 'dark'
}
```

### Example `~/.ihn/config.json`

```json
{
  "provider": "anthropic",
  "model": "claude-opus-4-5",
  "autoApprove": false,
  "allowedCommands": ["git status", "git diff", "pnpm test"],
  "maxContextTokens": 120000,
  "theme": "dark"
}
```

> **Note:** `apiKey` should **never** be placed in the JSON file if it could be committed to version control. Always prefer the environment variable (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.).

### ConfigLoader Module

`ConfigLoader` lives in `@ihn-agent/core` and is the **single source of truth** for resolved config at runtime.

```typescript
// packages/core/src/config-loader.ts
export class ConfigLoader {
  static load(overrides?: Partial<AgentConfig>): AgentConfig {
    const fileConfig = ConfigLoader.readJsonFile(); // from disk
    const envConfig = ConfigLoader.readEnv(); // from process.env
    return deepMerge(DEFAULTS, fileConfig, envConfig, overrides ?? {});
  }

  private static readJsonFile(): Partial<AgentConfig> {
    const filePath =
      process.env.IHN_CONFIG ??
      findUp('.ihn/config.json') ?? // cwd → parent dirs
      path.join(os.homedir(), '.ihn', 'config.json');

    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  private static readEnv(): Partial<AgentConfig> {
    return {
      provider: process.env.IHN_PROVIDER as AgentConfig['provider'],
      model: process.env.IHN_MODEL,
      apiKey:
        process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.GEMINI_API_KEY,
      maxContextTokens: Number(process.env.IHN_MAX_TOKENS) || undefined,
      maxTurns: Number(process.env.IHN_MAX_TURNS) || undefined,
      autoApprove: process.env.IHN_AUTO_APPROVE === 'true',
      streamOutput: process.env.IHN_STREAM !== 'false',
    };
  }
}
```

### Environment Variable Reference

| Variable            | JSON key           | Description                                |
| ------------------- | ------------------ | ------------------------------------------ |
| `IHN_CONFIG`        | —                  | Explicit path to config JSON file          |
| `IHN_PROVIDER`      | `provider`         | LLM provider name                          |
| `IHN_MODEL`         | `model`            | Model identifier                           |
| `ANTHROPIC_API_KEY` | `apiKey`           | Anthropic API key                          |
| `OPENAI_API_KEY`    | `apiKey`           | OpenAI API key                             |
| `GEMINI_API_KEY`    | `apiKey`           | Google Gemini API key                      |
| `IHN_MAX_TOKENS`    | `maxContextTokens` | Context window size cap                    |
| `IHN_MAX_TURNS`     | `maxTurns`         | Max agent loop iterations                  |
| `IHN_AUTO_APPROVE`  | `autoApprove`      | Skip confirmation prompts (`true`/`false`) |
| `IHN_STREAM`        | `streamOutput`     | Disable streaming (`false` to turn off)    |

---

## CLI Architecture

The CLI (`@ihn-agent/cli`) is the user-facing shell. It uses **Ink** (React for terminals) to render an interactive REPL.

```
cli/src/
├── index.tsx          ← entry point, renders <App />
├── components/
│   ├── app.tsx        ← root component, owns agent + state
│   ├── message-list/   ← renders conversation history
│   ├── input-box/     ← captures keyboard input
│   ├── tool-call-view/  ← shows tool invocations in real time
│   └── status-bar/     ← model name, token count, spinner
├── hooks/
│   ├── use-agent.ts   ← wraps Agent.run(), exposes stream
│   └── use-keyboard.ts ← multi-line input, history, shortcuts
└── config.ts          ← calls ConfigLoader.load(), passes AgentConfig to Agent
```

**State machine** for the App:

```
IDLE → THINKING → TOOL_CALL → THINKING → ... → IDLE
  ▲                                              │
  └──────────────────────────────────────────────┘
```

---

## Data Flow

A complete request from the user's perspective:

```
[User types message] ──► input-box
                              │
                     use-agent.send(msg)
                              │
                    Agent.run(msg) ── streaming ──► MessageList (streamed text)
                              │
                    ToolDispatcher.dispatch()
                              │
                    ┌─────────┴──────────┐
                    │  Approval Gate      │  (for run_command)
                    │  User: yes/no?      │
                    └─────────┬──────────┘
                              │
                    Tool.execute()   ──► ToolCallView (shows result)
                              │
                    ConversationHistory.addToolResults()
                              │
                    next LLM iteration …
                              │
                    stopReason === 'end_turn'
                              │
                    Final message rendered ──► MessageList
                              │
                         [IDLE state]
```

---

## Advanced Behaviours

### Sequential Tool Execution

Tool calls returned in a single LLM response are executed **one at a time, in order** — not in parallel. This is a deliberate safety choice:

- Each tool result is available to the next tool in the same turn (e.g. a `read_file` result can inform a subsequent `edit_file`).
- Destructive tools can be interrupted mid-sequence without cascading side effects.
- The approval gate can inspect results incrementally instead of all at once.

If the LLM requests multiple independent read-only tools in one turn, a future optimisation can allow concurrent execution for tools where `riskLevel === 'safe'` and `cacheable === true`.

---

### Tool Error Handling

Errors inside `Tool.execute()` must never crash the agent loop. `ToolDispatcher` wraps every call:

```typescript
async dispatchOne(call: ToolCall): Promise<ToolResult> {
  const tool = this.registry.get(call.name);

  if (!tool) {
    return { toolCallId: call.id, isError: true,
             content: `Unknown tool: ${call.name}` };
  }

  try {
    const output = await tool.execute(call.input, this.ctx);
    return { toolCallId: call.id, isError: false, content: stringify(output) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { toolCallId: call.id, isError: true,
             content: `Tool error (${call.name}): ${msg}` };
  }
}
```

The error is injected back into the conversation as a `tool_result` with `isError: true`. The LLM then decides whether to retry, take a different approach, or surface the error to the user.

---

### Loop Guard

`LoopGuard` prevents runaway agent sessions caused by infinite loops or repetitive behaviour:

```typescript
export class LoopGuard {
  private turns = 0;
  private recentToolCalls: string[] = []; // sliding window of last N tool call fingerprints

  check(maxTurns: number): void {
    this.turns++;
    if (this.turns > maxTurns) throw new LoopLimitError(`Exceeded ${maxTurns} turns`);

    // detect repetition: same tool + same input called 3+ times in a row
    if (this.hasRepeatingPattern())
      throw new LoopRepetitionError('Detected repeating tool-call pattern');
  }

  recordToolCall(name: string, inputHash: string): void {
    this.recentToolCalls.push(`${name}:${inputHash}`);
    if (this.recentToolCalls.length > 10) this.recentToolCalls.shift();
  }

  reset(): void {
    this.turns = 0;
    this.recentToolCalls = [];
  }
}
```

When the limit is hit, the error is surfaced to the user in the CLI with a clear explanation rather than crashing silently.

---

### Retry Strategy

Transient failures (network timeouts, rate limits) are retried with **exponential backoff**. Deterministic failures (bad input, auth error) are not retried.

```typescript
// packages/core/src/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options = { maxAttempts: 3, baseDelayMs: 1000, retryable: isTransient }
): Promise<T> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === options.maxAttempts || !options.retryable(err)) throw err;
      const delay = options.baseDelayMs * 2 ** (attempt - 1);  // 1s, 2s, 4s
      await sleep(delay);
    }
  }
}

function isTransient(err: unknown): boolean {
  // retry on: 429 rate-limit, 503 service unavailable, network ECONNRESET
  // do NOT retry on: 400 bad request, 401 auth, tool logic errors
  ...
}
```

Tools marked `retryable: true` in their metadata are also retried automatically by `ToolDispatcher` on transient failure, up to 2 extra attempts.

---

### Tool Caching

Read-only tools (`read_file`, `list_dir`, `grep_search`, `web_search`) are cacheable. A simple in-memory `ToolCache` avoids redundant calls within a session:

```typescript
// packages/core/src/tool-cache.ts
export class ToolCache {
  private store = new Map<string, unknown>();

  get(toolName: string, input: unknown): unknown | undefined {
    return this.store.get(cacheKey(toolName, input));
  }

  set(toolName: string, input: unknown, result: unknown): void {
    this.store.set(cacheKey(toolName, input), result);
  }

  invalidate(path: string): void {
    // called by write_file / edit_file to evict stale read_file entries
    for (const key of this.store.keys()) if (key.includes(path)) this.store.delete(key);
  }
}
```

The cache is scoped to one agent session and cleared on reset. Write tools that modify files call `cache.invalidate(path)` to evict stale entries.

---

### Event System

The CLI must not be directly coupled to the agent's internal stream. An **EventEmitter**-based event bus decouples them:

```typescript
// packages/core/src/events.ts
export type AgentEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'thinking'; content: string } // reasoning before tool calls
  | { type: 'tool_start'; name: string; input: unknown }
  | { type: 'tool_result'; name: string; output: unknown; isError: boolean }
  | { type: 'turn_end' }
  | { type: 'error'; message: string }
  | { type: 'interrupted' }; // Ctrl+C received
```

The `Agent` emits events; the CLI subscribes and renders accordingly. This also makes it easy to add a future web UI or test harness that consumes the same event stream.

---

### UX: Interrupt & Display Modes

#### Interrupt (Ctrl+C)

The CLI passes an `AbortSignal` to the agent on each turn. Pressing Ctrl+C:

1. Signals the `AbortController` → the current LLM stream and any in-flight tool call are cancelled.
2. The agent emits `{ type: 'interrupted' }` and returns to `IDLE` state.
3. The user is shown a short summary of what was completed before the interrupt.

#### Display Modes

The CLI renders three visually distinct output regions:

| Mode             | Trigger                             | Rendered as                                              |
| ---------------- | ----------------------------------- | -------------------------------------------------------- |
| **Thinking**     | `thinking` event                    | Dimmed italic text, collapsible                          |
| **Tool call**    | `tool_start` / `tool_result` events | Bordered box with tool name, input summary, ✅/❌ result |
| **Final answer** | `text_delta` after last tool        | Full-colour streamed text                                |

The state machine expands to:

```
IDLE → THINKING → TOOL_CALL → TOOL_RESULT → THINKING → ... → STREAMING → IDLE
  ▲         │                                                       │
  └─────────────────── INTERRUPTED ◄── Ctrl+C ────────────────────┘
```

---

## Key Design Decisions

### 1. Streaming first

All LLM responses are consumed as streams. The CLI renders tokens as they arrive. Buffering only happens for tool-call parsing (tool calls must be complete before dispatching).

### 2. Approval gate for destructive tools

Any tool tagged `requiresConfirmation: true` (e.g. `run_command`, `write_file`) pauses the loop and renders a yes/no prompt in the CLI. The loop only continues after user approval.

### 3. Tool results are injected back as messages

Following the Anthropic tool-use protocol, tool results are sent back as `tool_result` role messages. This keeps the architecture stateless w.r.t. the LLM — the model doesn't need to remember tool results, they're always in the context.

### 4. Provider abstraction at the boundary

Provider-specific SDKs are **never imported** in `@ihn-agent/core`. The core only sees `LLMProvider` interface. This makes it easy to add providers or mock them in tests.

### 5. JSON Schema for tool definitions

Tool input schemas are defined as JSON Schema objects (centralised in `@ihn-agent/schema`). The same schema is sent to the LLM (so it knows how to call the tool) and used for runtime validation (so bad calls are caught early with helpful errors).

### 6. Layered configuration (env > JSON file)

Config is never hard-coded. `ConfigLoader` merges defaults → JSON file → environment variables, so env vars always win. This lets teams commit a project-level `.ihn/config.json` with safe defaults while developers override any key locally via the shell. Secrets (`apiKey`) must live in env vars and must never appear in a committed JSON file.

### 7. Dedicated memory and schema packages

`@ihn-agent/memory` encapsulates all state concerns (working memory, persistence, summarisation) so the core loop stays focused on orchestration. `@ihn-agent/schema` is the single import point for shared types, preventing circular dependencies and duplicated definitions across packages.

---

## Directory Layout (Target)

```
ihn-agent/
├── apps/
│   └── cli/
│       └── src/
│           ├── index.tsx
│           ├── components/
│           │   ├── app.tsx
│           │   ├── message-list/
│           │   ├── input-box/
│           │   ├── tool-call-view/
│           │   └── status-bar/
│           ├── hooks/
│           │   ├── use-agent.ts
│           │   └── use-keyboard.ts
│           └── config.ts
│
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── agent.ts
│   │       ├── loop.ts
│   │       ├── conversation.ts
│   │       ├── loop-guard.ts      ← LoopGuard (turn limit + repetition detect)
│   │       ├── retry.ts           ← withRetry() + isTransient()
│   │       ├── tool-cache.ts      ← ToolCache (in-session read cache)
│   │       ├── events.ts          ← AgentEvent types + EventEmitter bus
│   │       ├── config-loader.ts   ← ConfigLoader (env + JSON merge)
│   │       ├── tool-dispatcher.ts
│   │       ├── tool-registry.ts
│   │       ├── streaming.ts
│   │       └── index.ts
│   │
│   ├── memory/
│   │   └── src/
│   │       ├── working-memory.ts  ← WorkingMemory (plan, openFiles, variables)
│   │       ├── memory-store.ts    ← MemoryStore (cross-session persistence)
│   │       ├── summariser.ts      ← LLM-based history compaction
│   │       └── index.ts
│   │
│   ├── schema/
│   │   └── src/
│   │       ├── tool.ts            ← ToolSchema, ToolCall, ToolResult
│   │       ├── message.ts         ← Message, Role, StreamChunk
│   │       ├── config.ts          ← AgentConfig interface + JSON Schema
│   │       ├── memory.ts          ← MemoryEntry, WorkingMemory interfaces
│   │       └── index.ts
│   │
│   ├── tools/
│   │   └── src/
│   │       ├── types.ts
│   │       ├── read-file.ts
│   │       ├── write-file.ts
│   │       ├── edit-file.ts
│   │       ├── list-dir.ts
│   │       ├── run-command.ts
│   │       ├── grep-search.ts
│   │       ├── web-search.ts
│   │       ├── task-complete.ts
│   │       └── index.ts
│   │
│   └── providers/
│       └── src/
│           ├── types.ts
│           ├── anthropic.ts
│           ├── openai.ts
│           ├── gemini.ts
│           └── index.ts
│
└── docs/
    └── ARCHITECTURE.md
```

---

## Roadmap

Features deferred from v1 but architecturally planned for:

| Feature               | Description                                                                                                                                                  | Dependency                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| **Planning phase**    | Before the main loop, an explicit planning step generates a numbered task list that is stored in `WorkingMemory.plan` and checked off as the loop progresses | memory package (done)                  |
| **Persistent memory** | Cross-session memory stored in `~/.ihn/history.jsonl`; injected as a summary into the system prompt at startup                                               | `MemoryStore` in memory package (done) |
| **Sandbox execution** | Shell commands run inside a Docker/nsjail container; the agent receives a restricted filesystem view                                                         | `run_command` tool risk model (done)   |
| **Multi-agent**       | A `delegate` tool spawns a sub-agent with a scoped context; results flow back as tool results                                                                | Event system (done)                    |
| **Plugin system**     | Users install tools via `pnpm add` into `~/.ihn/plugins/`; they are auto-registered at startup                                                               | ToolRegistry (done)                    |

---

## Extension Points

| What to extend                  | How                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Add a new tool                  | Create a `Tool` implementation in `@ihn-agent/tools`, register it in `ToolRegistry`          |
| Add a new LLM provider          | Implement `LLMProvider` interface in `@ihn-agent/providers`                                  |
| Add a new config key            | Add field to `AgentConfig` in `@ihn-agent/schema`, map it in `ConfigLoader.readEnv()`        |
| Add a new UI surface (web, TUI) | Create a new app in `apps/`, import `@ihn-agent/core`                                        |
| Change context strategy         | Replace `ConversationHistory` implementation, core loop doesn't change                       |
| Add persistent memory           | Implement `MemoryStore` in `@ihn-agent/memory` — reads/writes key context at turn boundaries |
| Add new shared types            | Add definitions to `@ihn-agent/schema` and re-export from `index.ts`                         |

---

## Tech Stack Summary

| Layer             | Technology                        | Reason                                 |
| ----------------- | --------------------------------- | -------------------------------------- |
| Language          | TypeScript 5+                     | Type safety across all packages        |
| Package manager   | pnpm (workspaces)                 | Fast, disk-efficient monorepo          |
| Terminal UI       | Ink (React)                       | Component model for terminal rendering |
| LLM SDK (default) | `@anthropic-ai/sdk`               | Claude model family, native tool-use   |
| Build             | `tsc` per package                 | Simple, no bundler needed for Node     |
| Dev run           | `tsx watch`                       | Fast TS execution without build step   |
| Linting           | ESLint + `typescript-eslint`      | Consistent code quality                |
| Formatting        | Prettier                          | Enforced via `lint-staged` + Husky     |
| Commit convention | Conventional Commits + commitlint | Readable git history                   |
