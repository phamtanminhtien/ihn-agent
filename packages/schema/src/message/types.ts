export type ConversationRole = 'system' | 'user' | 'assistant' | 'tool_result';

export type StopReason = 'end_turn' | 'tool_use';

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  content: string;
  isError: boolean;
}

export interface BaseMessage {
  role: ConversationRole;
  content: string;
}

export interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  stopReason?: StopReason;
  toolCalls?: ToolCall[];
}

export interface ToolResultMessage extends BaseMessage {
  role: 'tool_result';
  toolCallId: string;
  name: string;
  isError: boolean;
}

export type ConversationMessage = BaseMessage | AssistantMessage | ToolResultMessage;

// Streaming types
export type StreamChunkType = 'text' | 'thinking' | 'tool_use';

export interface TextChunk {
  type: 'text';
  content: string;
}

export interface ThinkingChunk {
  type: 'thinking';
  content: string;
}

export interface ToolUseChunk {
  type: 'tool_use';
  call: ToolCall;
}

export type StreamChunk = TextChunk | ThinkingChunk | ToolUseChunk;
