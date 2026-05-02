import type { WorkingMemory } from './memory.types';

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high';

export interface ToolMetadata {
  /**
   * Pause loop and ask user before executing
   */
  requiresConfirmation: boolean;
  /**
   * Used for tiered approval UX
   */
  riskLevel: RiskLevel;
  /**
   * Results can be cached keyed on input
   */
  cacheable: boolean;
  /**
   * Safe to retry on transient failure
   */
  retryable: boolean;
  /**
   * ms before the tool call is aborted
   */
  timeout?: number;
  /**
   * The name of the provider that supplied this tool (e.g. 'builtin', 'mcp:server-name')
   */
  provider?: string | undefined;
}

export interface ToolContext {
  /**
   * Shared state across tool calls within one session
   */
  workingMemory: WorkingMemory;
  /**
   * Cancelled on Ctrl+C or timeout
   */
  signal: AbortSignal;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  /**
   * Sent to LLM + used for validation (JSON Schema)
   */
  inputSchema: unknown;
  metadata: ToolMetadata;
  execute(input: TInput, ctx: ToolContext): Promise<TOutput>;
  validate?(input: unknown): TInput;
}

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: unknown;
}

export interface ToolProvider {
  name: string;
  getTools(): Promise<Tool[]>;
}
