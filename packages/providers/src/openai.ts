import type {
  ChatProvider,
  ConversationMessage,
  ProviderStream,
  ToolSchema,
} from '@ihn-agent/types';
import OpenAI from 'openai';

export interface OpenAIProviderOptions {
  apiKey: string;
  model?: string | undefined;
  baseUrl?: string | undefined;
}

export class OpenAIProvider implements ChatProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    });
    this.model = options.model ?? 'gpt-4o';
  }

  async streamChat(
    messages: readonly ConversationMessage[],
    tools: readonly ToolSchema[]
  ): Promise<ProviderStream> {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg) => {
      if (msg.role === 'system') {
        return { role: 'system', content: msg.content };
      } else if (msg.role === 'user') {
        return { role: 'user', content: msg.content };
      } else if (msg.role === 'assistant') {
        const assistantMsg: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: msg.content || null,
        };
        if ('toolCalls' in msg && msg.toolCalls) {
          assistantMsg.tool_calls = msg.toolCalls.map((tc: any) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.input),
            },
          }));
        }
        return assistantMsg;
      } else if (msg.role === 'tool_result') {
        const toolResult = msg as any;
        return {
          role: 'tool',
          tool_call_id: toolResult.toolCallId,
          content: toolResult.content,
        };
      }
      throw new Error(`Unsupported role: ${msg.role}`);
    });

    const openaiTools: OpenAI.Chat.ChatCompletionTool[] = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema as Record<string, unknown>,
      },
    }));

    const body: any = {
      model: this.model,
      messages: openaiMessages,
      stream: true,
    };

    if (openaiTools.length > 0) {
      body.tools = openaiTools;
    }

    const stream = (await this.client.chat.completions.create(body)) as any;

    return {
      async *[Symbol.asyncIterator]() {
        const toolCallBuffers = new Map<number, { id: string; name: string; arguments: string }>();

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            yield { type: 'text', content: delta.content };
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index === undefined) continue;

              let buffer = toolCallBuffers.get(tc.index);
              if (!buffer) {
                buffer = { id: tc.id || '', name: tc.function?.name || '', arguments: '' };
                toolCallBuffers.set(tc.index, buffer);
              }

              if (tc.id) buffer.id = tc.id;
              if (tc.function?.name) buffer.name = tc.function.name;
              if (tc.function?.arguments) buffer.arguments += tc.function.arguments;
            }
          }

          if (chunk.choices[0]?.finish_reason === 'tool_calls') {
            for (const buffer of toolCallBuffers.values()) {
              yield {
                type: 'tool_use',
                call: {
                  id: buffer.id,
                  name: buffer.name,
                  input: JSON.parse(buffer.arguments || '{}'),
                },
              };
            }
            toolCallBuffers.clear();
          }
        }

        // Catch-all for tools that might not have finish_reason set per chunk
        if (toolCallBuffers.size > 0) {
          for (const buffer of toolCallBuffers.values()) {
            yield {
              type: 'tool_use',
              call: {
                id: buffer.id,
                name: buffer.name,
                input: JSON.parse(buffer.arguments || '{}'),
              },
            };
          }
        }
      },
    } as ProviderStream;
  }
}
