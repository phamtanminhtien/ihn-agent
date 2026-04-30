import type { ToolCall } from './conversation.types.js';

export type StreamChunkType = 'text' | 'thinking' | 'tool_use';

export type TextChunk = { type: 'text'; content: string };
export type ThinkingChunk = { type: 'thinking'; content: string };
export type ToolUseChunk = { type: 'tool_use'; call: ToolCall };

export type StreamChunk = TextChunk | ThinkingChunk | ToolUseChunk;
