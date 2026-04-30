import type { AssistantMessage, StreamChunk, ToolCall } from '@ihn-agent/schema';

type StopReason = NonNullable<AssistantMessage['stopReason']>;

export class StreamingHandler {
  private text = '';
  private thinking = '';
  private toolCalls: ToolCall[] = [];
  private stopReason: StopReason = 'end_turn';

  consume(chunk: StreamChunk): void {
    if (chunk.type === 'text') {
      this.text += chunk.content;
      return;
    }

    if (chunk.type === 'thinking') {
      this.thinking += chunk.content;
      return;
    }

    this.stopReason = 'tool_use';
    this.toolCalls.push(chunk.call);
  }

  finalMessage(): AssistantMessage {
    const content = this.thinking ? `${this.thinking}\n${this.text}`.trim() : this.text;

    const message: AssistantMessage = {
      role: 'assistant',
      content,
      stopReason: this.stopReason,
    };

    if (this.toolCalls.length > 0) {
      message.toolCalls = [...this.toolCalls];
    }

    return message;
  }
}
