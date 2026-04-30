import type {
  ChatProvider,
  ConversationMessage,
  LoopIterationOutput,
  StreamChunk,
  ToolResult,
  ToolSchema,
} from '@ihn-agent/schema';

import { StreamingHandler } from './streaming.js';
import { ToolDispatcher } from './tool-dispatcher.js';

export class AgentLoop {
  constructor(
    private readonly provider: ChatProvider,
    private readonly dispatcher: ToolDispatcher
  ) {}

  async runOnce(
    messages: readonly ConversationMessage[],
    tools: readonly ToolSchema[]
  ): Promise<LoopIterationOutput> {
    const stream = await this.provider.streamChat(messages, tools);
    const handler = new StreamingHandler();
    const chunks: StreamChunk[] = [];

    for await (const chunk of stream) {
      handler.consume(chunk);
      chunks.push(chunk);
    }

    const assistantMessage = handler.finalMessage();
    const toolResults: ToolResult[] = [];

    for (const call of assistantMessage.toolCalls ?? []) {
      const result = await this.dispatcher.dispatchOne(call);
      toolResults.push(result);
    }

    return { chunks, assistantMessage, toolResults };
  }
}
