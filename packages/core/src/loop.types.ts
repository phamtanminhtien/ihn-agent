import type { AssistantMessage, ToolResult } from './conversation.types.js';
import type { StreamChunk } from './streaming.types.js';

export interface ProviderStream {
  [Symbol.asyncIterator](): AsyncIterator<StreamChunk>;
}

export interface ChatProvider {
  streamChat(messages: readonly unknown[], tools: readonly unknown[]): Promise<ProviderStream>;
}

export interface LoopIterationOutput {
  chunks: StreamChunk[];
  assistantMessage: AssistantMessage;
  toolResults: ToolResult[];
}
