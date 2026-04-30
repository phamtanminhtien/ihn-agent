import { type Content, GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ChatProvider,
  ConversationMessage,
  ProviderStream,
  ToolSchema,
} from '@ihn-agent/types';

export interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
}

export class GeminiProvider implements ChatProvider {
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;

  constructor(options: GeminiProviderOptions) {
    this.client = new GoogleGenerativeAI(options.apiKey);
    this.model = options.model ?? 'gemini-1.5-flash';
  }

  async streamChat(
    messages: readonly ConversationMessage[],
    tools: readonly ToolSchema[]
  ): Promise<ProviderStream> {
    const model = this.client.getGenerativeModel({ model: this.model });

    const systemMessage = messages.find((m) => m.role === 'system');
    const history: Content[] = messages
      .filter((m) => m.role !== 'system')
      .map((msg) => {
        if (msg.role === 'user') {
          return { role: 'user', parts: [{ text: msg.content }] };
        } else if (msg.role === 'assistant') {
          const parts: any[] = [];
          if (msg.content) {
            parts.push({ text: msg.content });
          }
          if ('toolCalls' in msg && msg.toolCalls) {
            for (const tc of msg.toolCalls) {
              parts.push({
                functionCall: {
                  name: tc.name,
                  args: tc.input as Record<string, unknown>,
                },
              });
            }
          }
          return { role: 'model', parts };
        } else if (msg.role === 'tool_result') {
          const toolResult = msg as any;
          return {
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: toolResult.name,
                  response: { content: toolResult.content },
                },
              },
            ],
          };
        }
        throw new Error(`Unsupported role: ${msg.role}`);
      });

    const geminiTools =
      tools.length > 0
        ? [
            {
              functionDeclarations: tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: t.inputSchema as any,
              })),
            },
          ]
        : undefined;

    const body: any = {
      contents: history,
    };

    if (systemMessage?.content) {
      body.systemInstruction = systemMessage.content;
    }

    if (geminiTools) {
      body.tools = geminiTools;
    }

    const result = await model.generateContentStream(body);

    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of result.stream) {
          const part = chunk.candidates?.[0]?.content?.parts?.[0];
          if (!part) continue;

          if (part.text) {
            yield { type: 'text', content: part.text };
          }

          if (part.functionCall) {
            yield {
              type: 'tool_use',
              call: {
                id: Math.random().toString(36).substring(7), // Gemini doesn't always provide IDs in FunctionCall
                name: part.functionCall.name,
                input: part.functionCall.args,
              },
            };
          }
        }
      },
    } as ProviderStream;
  }
}
