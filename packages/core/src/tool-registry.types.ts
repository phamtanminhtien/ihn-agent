export type RiskLevel = 'safe' | 'low' | 'medium' | 'high';

export interface ToolMetadata {
  requiresConfirmation: boolean;
  riskLevel: RiskLevel;
  cacheable: boolean;
  retryable: boolean;
  timeout?: number;
}

export interface ToolContext {
  workingMemory: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: unknown;
  metadata: ToolMetadata;
  execute(input: TInput, ctx: ToolContext): Promise<TOutput>;
}

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: unknown;
}
