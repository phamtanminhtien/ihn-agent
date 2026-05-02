# IHN Agent

**Intelligent Helper Node** — an open-source, agentic AI coding assistant that runs in your terminal.

IHN is a TypeScript-based framework that connects to your preferred LLM provider and autonomously executes multi-step software engineering tasks. It reads files, runs shell commands, searches code, and manages conversations with minimal human intervention.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Packages](#packages)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Capabilities

- **Multi-Provider Support** — Seamlessly switch between OpenAI, Anthropic Claude, and Google Gemini
- **Agentic Loop** — Autonomous planning and execution of multi-step tasks with reasoning
- **Real-Time Streaming** — Stream tokens from LLM responses as they arrive
- **Built-In Tools** — Filesystem operations, shell execution, code search, and task management
- **Extensible Architecture** — Register custom tools and providers easily
- **Type-Safe** — Full TypeScript support with strict type checking
- **Conversation Management** — Maintain context across multiple interactions
- **Tool Dispatching** — Intelligent routing of tool calls to appropriate handlers

### Built-In Tools

- **Filesystem** — Read, write, edit, and list files
- **Shell** — Execute commands and capture output
- **Search** — Find patterns and symbols in code
- **Task** — Signal task completion with results

## Architecture

IHN follows a modular, layered architecture:

```
┌─────────────────────────────────────┐
│         CLI Application             │
│      (apps/cli)                     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Agent Core Loop                │
│   (packages/core)                   │
│  - Agent orchestration              │
│  - Conversation management          │
│  - Tool dispatching                 │
│  - Streaming                        │
└──────────────┬──────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼──────┐   ┌─────▼──────────┐
│  Providers │   │  Tools         │
│ (packages/ │   │ (packages/     │
│  providers)│   │  tools)        │
│            │   │                │
│ - OpenAI   │   │ - Filesystem   │
│ - Anthropic│   │ - Shell        │
│ - Gemini   │   │ - Search       │
└────────────┘   │ - Task         │
                 └────────────────┘
```

### Data Flow

1. **User Input** → CLI receives task or query
2. **Agent Planning** → LLM analyzes task and plans steps
3. **Tool Execution** → Agent calls appropriate tools
4. **Result Processing** → Results fed back to LLM
5. **Loop** → Repeat until task complete or user stops

## Requirements

- **Node.js** >= 24.15.0
- **pnpm** >= 10.28.1 (package manager)
- **API Key** for at least one LLM provider (OpenAI, Anthropic, or Google)

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/phamtanminhtien/ihn-agent.git
cd ihn-agent

# Install dependencies using pnpm
pnpm install

# Build all packages
pnpm build

# Verify installation
pnpm test
```

### Verify Node Version

```bash
node --version  # Should be >= 24.15.0
```

## Quick Start

### 1. Set Up API Key

Choose your preferred LLM provider and set the API key:

```bash
# For Anthropic Claude
export ANTHROPIC_API_KEY="sk-ant-..."

# For OpenAI
export OPENAI_API_KEY="sk-..."

# For Google Gemini
export GEMINI_API_KEY="..."
```

### 2. Create Configuration File

Create `~/.ihn/config.json`:

```json
{
  "provider": "anthropic",
  "model": "claude-opus-4-5",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

### 3. Start the CLI

```bash
pnpm cli:start
```

### 4. Give It a Task

```
> Read the file src/utils.ts and explain what it does
```

The agent will:

1. Read the file
2. Analyze the code
3. Provide a detailed explanation
4. Ask if you need anything else

## Configuration

### Configuration File

Location: `~/.ihn/config.json`

```json
{
  "provider": "anthropic",
  "model": "claude-opus-4-5",
  "temperature": 0.7,
  "maxTokens": 4096,
  "timeout": 30000,
  "retryAttempts": 3
}
```

### Environment Variables

```bash
# Provider selection
IHN_PROVIDER=anthropic

# API Keys (required)
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...

# Model configuration
IHN_MODEL=claude-opus-4-5
IHN_TEMPERATURE=0.7
IHN_MAX_TOKENS=4096
```

### Supported Providers

| Provider  | Model                             | Env Variable      |
| --------- | --------------------------------- | ----------------- |
| Anthropic | claude-opus-4-5, claude-sonnet-4  | ANTHROPIC_API_KEY |
| OpenAI    | gpt-4-turbo, gpt-4, gpt-3.5-turbo | OPENAI_API_KEY    |
| Google    | gemini-pro, gemini-pro-vision     | GEMINI_API_KEY    |

## Usage

### Development Mode

```bash
# Start with file watching and hot reload
pnpm cli:dev
```

### Production Build

```bash
# Build the CLI
pnpm cli:build

# Run the built version
pnpm cli:start
```

### Common Tasks

#### Read and Analyze Code

```
> Read src/components/Button.tsx and explain the component structure
```

#### Search for Patterns

```
> Find all instances of TODO comments in the codebase
```

#### Execute Commands

```
> Run npm test and show me the results
```

#### Multi-Step Tasks

```
> Create a new utility function for date formatting, write tests for it, and update the exports
```

## Project Structure

```
ihn-agent/
├── apps/
│   └── cli/                    # CLI application entry point
│       ├── src/
│       │   ├── index.ts        # Main CLI entry
│       │   ├── commands/       # CLI commands
│       │   └── utils/          # CLI utilities
│       └── package.json
│
├── packages/
│   ├── core/                   # Core agent logic
│   │   ├── src/
│   │   │   ├── agent.ts        # Main agent class
│   │   │   ├── loop.ts         # Agent execution loop
│   │   │   ├── conversation.ts # Conversation management
│   │   │   ├── tool-registry.ts # Tool registration
│   │   │   ├── tool-dispatcher.ts # Tool execution
│   │   │   ├── streaming.ts    # Token streaming
│   │   │   └── config-loader.ts # Configuration loading
│   │   └── package.json
│   │
│   ├── providers/              # LLM provider adapters
│   │   ├── src/
│   │   │   ├── anthropic.ts    # Anthropic adapter
│   │   │   ├── openai.ts       # OpenAI adapter
│   │   │   ├── gemini.ts       # Google Gemini adapter
│   │   │   └── index.ts        # Provider exports
│   │   └── package.json
│   │
│   ├── tools/                  # Built-in tools
│   │   ├── src/
│   │   │   ├── base-tool.ts    # Base tool class
│   │   │   ├── fs/             # Filesystem tools
│   │   │   ├── shell/          # Shell execution tools
│   │   │   ├── search/         # Code search tools
│   │   │   ├── task/           # Task management tools
│   │   │   └── index.ts        # Tool exports
│   │   └── package.json
│   │
│   ├── types/                  # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── agent.ts        # Agent types
│   │   │   ├── provider.ts     # Provider types
│   │   │   ├── tool.ts         # Tool types
│   │   │   └── index.ts        # Type exports
│   │   └── package.json
│   │
│   ├── prompt/                 # Prompt templates
│   │   ├── src/
│   │   │   ├── system.ts       # System prompts
│   │   │   ├── user.ts         # User prompts
│   │   │   └── index.ts        # Prompt exports
│   │   └── package.json
│   │
│   └── [other packages]/
│
├── docs/                       # Documentation
├── .husky/                     # Git hooks
├── .vscode/                    # VS Code settings
├── eslint.config.mjs           # ESLint configuration
├── tsconfig.json               # TypeScript configuration
├── vitest.config.ts            # Vitest configuration
├── pnpm-workspace.yaml         # pnpm workspace config
├── package.json                # Root package.json
├── LICENSE                     # MIT License
└── README.md                   # This file
```

## Packages

### @ihn-agent/core

Core agent orchestration and execution logic.

**Key Exports:**

- `Agent` — Main agent class
- `ToolRegistry` — Tool registration system
- `ToolDispatcher` — Tool execution dispatcher
- `Conversation` — Conversation state management

**Usage:**

```typescript
import { Agent } from '@ihn-agent/core';

const agent = new Agent({
  provider: 'anthropic',
  model: 'claude-opus-4-5',
});

await agent.run('Read src/index.ts and explain it');
```

### @ihn-agent/providers

LLM provider adapters for OpenAI, Anthropic, and Google Gemini.

**Supported Providers:**

- `AnthropicProvider` — Anthropic Claude models
- `OpenAIProvider` — OpenAI GPT models
- `GeminiProvider` — Google Gemini models

**Usage:**

```typescript
import { AnthropicProvider } from '@ihn-agent/providers';

const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-opus-4-5',
});
```

### @ihn-agent/tools

Built-in tools for filesystem, shell, search, and task management.

**Available Tools:**

- `ReadFileTool` — Read file contents
- `WriteFileTool` — Write/create files
- `EditFileTool` — Edit file sections
- `ListDirTool` — List directory contents
- `ShellTool` — Execute shell commands
- `SearchTool` — Search code patterns
- `TaskCompleteTool` — Signal task completion

**Usage:**

```typescript
import { ReadFileTool, ShellTool } from '@ihn-agent/tools';

const registry = new ToolRegistry();
registry.register(new ReadFileTool());
registry.register(new ShellTool());
```

### @ihn-agent/types

Shared TypeScript type definitions.

**Key Types:**

- `Agent` — Agent configuration and state
- `Provider` — LLM provider interface
- `Tool` — Tool interface
- `Message` — Conversation message
- `ToolCall` — Tool invocation

### @ihn-agent/prompt

Prompt templates and system instructions.

**Exports:**

- `SYSTEM_PROMPT` — Default system prompt
- `TOOL_INSTRUCTIONS` — Tool usage instructions
- `formatPrompt()` — Prompt formatting utilities

## Development

### Scripts

```bash
# Testing
pnpm test              # Run all tests
pnpm test:watch       # Run tests in watch mode

# Linting & Formatting
pnpm lint             # Lint all packages
pnpm lint:fix         # Fix linting issues
pnpm format           # Format with Prettier
pnpm type-check       # Type-check all packages

# Building
pnpm build            # Build all packages
pnpm cli:build        # Build CLI only

# Development
pnpm cli:dev          # Start CLI in dev mode
pnpm cli:start        # Start CLI in production mode
```

### Adding a New Tool

1. Create a new file in `packages/tools/src/`:

```typescript
import { BaseTool } from './base-tool';

export class MyTool extends BaseTool {
  name = 'my_tool';
  description = 'Description of what this tool does';

  async execute(params: Record<string, unknown>): Promise<string> {
    // Implementation
    return 'result';
  }
}
```

2. Register in `packages/tools/src/index.ts`:

```typescript
export { MyTool } from './my-tool';
```

3. Register in the agent:

```typescript
import { MyTool } from '@ihn-agent/tools';

registry.register(new MyTool());
```

### Adding a New Provider

1. Create a new file in `packages/providers/src/`:

```typescript
import { BaseProvider } from './base-provider';

export class MyProvider extends BaseProvider {
  async chat(messages: Message[]): Promise<string> {
    // Implementation
  }

  async stream(messages: Message[]): AsyncIterable<string> {
    // Implementation
  }
}
```

2. Export from `packages/providers/src/index.ts`

3. Update configuration to support the new provider

### Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @ihn-agent/core test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Code Quality

- **Linting** — ESLint with TypeScript support
- **Formatting** — Prettier
- **Type Checking** — TypeScript strict mode
- **Pre-commit Hooks** — Husky + lint-staged

## Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/ihn-agent.git`
3. Create a feature branch: `git checkout -b feat/your-feature`
4. Install dependencies: `pnpm install`

### Development Workflow

1. Make your changes
2. Run tests: `pnpm test`
3. Run linter: `pnpm lint:fix`
4. Format code: `pnpm format`
5. Type-check: `pnpm type-check`

### Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix a bug
docs: update documentation
test: add tests
refactor: refactor code
chore: update dependencies
```

Examples:

```bash
git commit -m "feat: add support for custom tool registration"
git commit -m "fix: handle streaming errors gracefully"
git commit -m "docs: update configuration guide"
```

### Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass: `pnpm test`
4. Ensure code is formatted: `pnpm format`
5. Create a descriptive PR title and description
6. Link any related issues

### Code Style

- Follow existing code patterns
- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Write tests for new functionality

## Troubleshooting

### API Key Not Found

```
Error: API key not found for provider 'anthropic'
```

**Solution:** Set the environment variable:

```bash
export ANTHROPIC_API_KEY="your-key-here"
```

### Module Not Found

```
Error: Cannot find module '@ihn-agent/core'
```

**Solution:** Rebuild packages:

```bash
pnpm install
pnpm build
```

### Tests Failing

```bash
# Clear cache and reinstall
pnpm install --force
pnpm test
```

### Type Errors

```bash
# Run type-check to see all errors
pnpm type-check
```

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Support

- **Issues** — Report bugs on [GitHub Issues](https://github.com/phamtanminhtien/ihn-agent/issues)
- **Discussions** — Ask questions on [GitHub Discussions](https://github.com/phamtanminhtien/ihn-agent/discussions)
- **Documentation** — See the [docs](docs/) directory

## Acknowledgments

Built with:

- [TypeScript](https://www.typescriptlang.org/)
- [Zod](https://zod.dev/) for schema validation
- [Vitest](https://vitest.dev/) for testing
- [ESLint](https://eslint.org/) for linting
- [Prettier](https://prettier.io/) for formatting
