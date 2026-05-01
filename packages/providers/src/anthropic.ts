import Anthropic from '@anthropic-ai/sdk';
import type {
  ChatProvider,
  ConversationMessage,
  ProviderStream,
  ToolResultMessage,
  ToolSchema,
} from '@ihn-agent/types';

export interface AnthropicProviderOptions {
  apiKey: string;
  model?: string | undefined;
  baseUrl?: string | undefined;
}

export class AnthropicProvider implements ChatProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: AnthropicProviderOptions) {
    this.client = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    });
    this.model = options.model ?? 'claude-3-5-sonnet-latest';
  }

  async streamChat(
    messages: readonly ConversationMessage[],
    tools: readonly ToolSchema[]
  ): Promise<ProviderStream> {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const system = systemMessages.map((m) => m.content).join('\n\n');

    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const msg of conversationMessages) {
      if (msg.role === 'user') {
        anthropicMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        const content: Anthropic.ContentBlockParam[] = [];
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        if ('toolCalls' in msg && msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.input as Record<string, unknown>,
            });
          }
        }
        anthropicMessages.push({ role: 'assistant', content });
      } else if (msg.role === 'tool_result') {
        const toolResult = msg as ToolResultMessage;
        // Find if we can append to the last user message if it was also a tool result
        const lastMsg = anthropicMessages[anthropicMessages.length - 1];
        if (lastMsg && lastMsg.role === 'user' && Array.isArray(lastMsg.content)) {
          lastMsg.content.push({
            type: 'tool_result',
            tool_use_id: toolResult.toolCallId,
            content: toolResult.content,
            is_error: toolResult.isError,
          });
        } else {
          anthropicMessages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolResult.toolCallId,
                content: toolResult.content,
                is_error: toolResult.isError,
              },
            ],
          });
        }
      }
    }

    const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    }));

    const body: any = {
      model: this.model,
      messages: anthropicMessages,
      max_tokens: 4096,
      stream: true,
    };

    if (system) {
      body.system = system;
    }

    if (anthropicTools.length > 0) {
      body.tools = anthropicTools;
    }

    const stream = (await this.client.messages.create(body)) as any;

    return {
      async *[Symbol.asyncIterator]() {
        let currentToolCall: { id: string; name: string; inputJson: string } | null = null;

        for await (const event of stream) {
          if (event.type === 'message_start') {
            continue;
          }

          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'tool_use') {
              currentToolCall = {
                id: event.content_block.id,
                name: event.content_block.name,
                inputJson: '',
              };
            }
          } else if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              yield { type: 'text', content: event.delta.text };
            } else if (event.delta.type === 'input_json_delta') {
              if (currentToolCall) {
                currentToolCall.inputJson += event.delta.partial_json;
              }
            }
          } else if (event.type === 'content_block_stop') {
            if (currentToolCall) {
              yield {
                type: 'tool_use',
                call: {
                  id: currentToolCall.id,
                  name: currentToolCall.name,
                  input: JSON.parse(currentToolCall.inputJson || '{}'),
                },
              };
              currentToolCall = null;
            }
          }
        }
      },
    } as ProviderStream;
  }
}
