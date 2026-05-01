import type {
  AssistantMessage,
  ConversationMessage,
  StreamChunk,
  ToolResult,
} from './message.types.js';
import type { IPromptComposer, PromptVariables } from './prompt.types.js';
import type { RiskLevel, ToolContext, ToolSchema } from './tool.types.js';

export type AgentTextDeltaEvent = { type: 'text_delta'; content: string };
export type AgentThinkingEvent = { type: 'thinking'; content: string };
export type AgentToolStartEvent = { type: 'tool_start'; name: string; input: unknown };
export type AgentToolResultEvent = {
  type: 'tool_result';
  name: string;
  output: unknown;
  isError: boolean;
};

export type AgentToolConfirmationEvent = {
  type: 'tool_confirmation';
  toolCallId: string;
  name: string;
  description: string;
  input: unknown;
  riskLevel: RiskLevel;
};
export type AgentTurnEndEvent = { type: 'turn_end' };
export type AgentErrorEvent = { type: 'error'; message: string };

export type AgentEvent =
  | AgentTextDeltaEvent
  | AgentThinkingEvent
  | AgentToolStartEvent
  | AgentToolResultEvent
  | AgentToolConfirmationEvent
  | AgentTurnEndEvent
  | AgentErrorEvent;

export interface ProviderStream {
  [Symbol.asyncIterator](): AsyncIterator<StreamChunk>;
}

export interface ChatProvider {
  streamChat(
    messages: readonly ConversationMessage[],
    tools: readonly ToolSchema[]
  ): Promise<ProviderStream>;

  /**
   * Optional method to list available models for this provider
   */
  listModels?(): Promise<string[]>;
}

export interface LoopIterationOutput {
  chunks: StreamChunk[];
  assistantMessage: AssistantMessage;
  toolResults: ToolResult[];
}

export interface AgentOptions {
  provider: ChatProvider;
  toolContext?: ToolContext;
  maxTurns?: number;
  /**
   * Set of tool call IDs that have been approved by the user
   */
  approvedToolCallIds?: Set<string>;
  /**
   * Optional system prompt to set the agent's persona and rules.
   * Can be a static string or an IPromptComposer.
   */
  systemPrompt?: string | IPromptComposer;
  /**
   * Variables to pass to the prompt composer if systemPrompt is an IPromptComposer.
   */
  promptVariables?: PromptVariables;
}
