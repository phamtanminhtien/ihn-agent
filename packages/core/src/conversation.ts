import type { AssistantMessage, ConversationMessage, ToolResult } from '@ihn-agent/types';

export class ConversationHistory {
  private readonly _messages: ConversationMessage[] = [];

  get messages(): readonly ConversationMessage[] {
    return this._messages;
  }

  addSystem(content: string): void {
    this._messages.push({ role: 'system', content });
  }

  addUser(content: string): void {
    this._messages.push({ role: 'user', content });
  }

  addAssistant(message: AssistantMessage): void {
    this._messages.push(message);
  }

  addToolResults(results: ToolResult[]): void {
    for (const result of results) {
      this._messages.push({
        role: 'tool_result',
        content: result.content,
        toolCallId: result.toolCallId,
        name: result.name,
        isError: result.isError,
      });
    }
  }
}
