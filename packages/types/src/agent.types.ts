import type {
  AssistantMessage,
  ConversationMessage,
  StreamChunk,
  ToolResult,
} from './message.types.js';
import type { ToolContext, ToolSchema } from './tool.types.js';

export type AgentTextDeltaEvent = { type: 'text_delta'; content: string };
export type AgentThinkingEvent = { type: 'thinking'; content: string };
export type AgentToolStartEvent = { type: 'tool_start'; name: string; input: unknown };
export type AgentToolResultEvent = {
  type: 'tool_result';
  name: string;
  output: unknown;
  isError: boolean;
};
export type AgentTurnEndEvent = { type: 'turn_end' };
export type AgentErrorEvent = { type: 'error'; message: string };

export type AgentEvent =
  | AgentTextDeltaEvent
  | AgentThinkingEvent
  | AgentToolStartEvent
  | AgentToolResultEvent
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
}
