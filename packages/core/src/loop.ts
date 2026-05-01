import type {
  AssistantMessage,
  ChatProvider,
  ConversationMessage,
  LoopIterationOutput,
  StreamChunk,
  ToolResult,
  ToolSchema,
} from '@ihn-agent/types';

import { StreamingHandler } from './streaming.js';
import { ToolDispatcher } from './tool-dispatcher.js';

export class AgentLoop {
  constructor(
    private readonly provider: ChatProvider,
    private readonly dispatcher: ToolDispatcher
  ) {}

  async runOnce(
    messages: readonly ConversationMessage[],
    tools: readonly ToolSchema[],
    approvedToolCallIds: Set<string> = new Set(),
    resumeMessage?: AssistantMessage
  ): Promise<LoopIterationOutput> {
    let assistantMessage: AssistantMessage;
    const chunks: StreamChunk[] = [];

    if (resumeMessage) {
      assistantMessage = resumeMessage;
    } else {
      const stream = await this.provider.streamChat(messages, tools);
      const handler = new StreamingHandler();

      for await (const chunk of stream) {
        handler.consume(chunk);
        chunks.push(chunk);
      }

      assistantMessage = handler.finalMessage();
    }
    const toolResults: ToolResult[] = [];

    for (const call of assistantMessage.toolCalls ?? []) {
      // Skip if result already exists in messages
      const exists = messages.some(
        (m) => m.role === 'tool_result' && 'toolCallId' in m && m.toolCallId === call.id
      );
      if (exists) {
        continue;
      }

      const result = await this.dispatcher.dispatchOne(call, approvedToolCallIds);
      toolResults.push(result);

      if (result.status === 'pending') {
        break;
      }
    }

    return { chunks, assistantMessage, toolResults };
  }
}
