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

export interface AssistantMessage {
  role: 'assistant';
  content: string;
  stopReason?: StopReason;
  toolCalls?: ToolCall[];
}

export interface BaseMessage {
  role: ConversationRole;
  content: string;
}

export interface ToolResultMessage extends BaseMessage {
  role: 'tool_result';
  toolCallId: string;
  name: string;
  isError: boolean;
}

export type ConversationMessage = BaseMessage | AssistantMessage | ToolResultMessage;
