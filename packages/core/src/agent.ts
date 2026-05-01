import { EventEmitter } from 'node:events';

import type {
  AgentEvent,
  AgentOptions,
  AssistantMessage,
  StreamChunk,
  Tool,
  ToolResult,
  ToolSchema,
} from '@ihn-agent/types';

import { ConversationHistory } from './conversation.js';
import { AgentLoop } from './loop.js';
import { ToolDispatcher } from './tool-dispatcher.js';
import { ToolRegistry } from './tool-registry.js';

export class Agent extends EventEmitter {
  private readonly conversation = new ConversationHistory();
  private readonly registry = new ToolRegistry();
  private readonly loop: AgentLoop;
  private readonly maxTurns: number;

  constructor(private readonly options: AgentOptions) {
    super();

    const dispatcher = new ToolDispatcher(
      this.registry,
      {
        workingMemory: {
          plan: [],
          openFiles: [],
          variables: {},
          completedSteps: [],
        },
        signal: new AbortController().signal,
        ...options.toolContext,
      },
      options.approvedToolCallIds
    );
    this.loop = new AgentLoop(options.provider, dispatcher);
    this.maxTurns = options.maxTurns ?? 8;
  }

  private async ensureSystemPrompt(): Promise<void> {
    const hasSystem = this.conversation.messages.some((m) => m.role === 'system');
    if (hasSystem) return;

    const { systemPrompt, promptVariables } = this.options;
    if (!systemPrompt) return;

    if (typeof systemPrompt === 'string') {
      this.conversation.addSystem(systemPrompt);
    } else {
      const content = await systemPrompt.compose(promptVariables ?? {});
      this.conversation.addSystem(content);
    }
  }

  registerTool(tool: Tool): void {
    this.registry.register(tool);
  }

  getToolSchemas(): ToolSchema[] {
    return this.registry.getSchemas();
  }

  getMessages() {
    return this.conversation.messages;
  }

  async *run(
    userMessage?: string,
    options?: { approvedToolCallIds?: Set<string> | undefined }
  ): AsyncGenerator<StreamChunk> {
    await this.ensureSystemPrompt();

    if (userMessage) {
      this.conversation.addUser(userMessage);
    }

    const lastMsg = this.conversation.messages[this.conversation.messages.length - 1];
    let isResuming =
      !userMessage &&
      lastMsg?.role === 'assistant' &&
      'toolCalls' in lastMsg &&
      (lastMsg.toolCalls?.length ?? 0) > 0;

    let turns = 0;
    while (turns < this.maxTurns) {
      turns += 1;

      const resumeMessage = isResuming ? (lastMsg as AssistantMessage) : undefined;
      isResuming = false;

      const iteration = await this.loop.runOnce(
        this.conversation.messages,
        this.registry.getSchemas(),
        options?.approvedToolCallIds,
        resumeMessage
      );

      for (const chunk of iteration.chunks) {
        if (chunk.type === 'text') {
          this.emitEvent({ type: 'text_delta', content: chunk.content });
        } else if (chunk.type === 'thinking') {
          this.emitEvent({ type: 'thinking', content: chunk.content });
        } else {
          this.emitEvent({
            type: 'tool_start',
            name: chunk.call.name,
            input: chunk.call.input,
          });
        }

        yield chunk;
      }

      if (!resumeMessage) {
        this.conversation.addAssistant(iteration.assistantMessage);
      }

      const pendingResult = iteration.toolResults.find((r) => r.status === 'pending');
      const finishedResults = iteration.toolResults.filter((r) => r.status !== 'pending');

      if (finishedResults.length > 0) {
        this.conversation.addToolResults(finishedResults);
        for (const result of finishedResults) {
          this.emitToolResult(result);
        }
      }

      if (pendingResult) {
        const tool = this.registry.get(pendingResult.name);
        this.emitEvent({
          type: 'tool_confirmation',
          toolCallId: pendingResult.toolCallId,
          name: pendingResult.name,
          description: tool?.description ?? '',
          riskLevel: tool?.metadata.riskLevel ?? 'high',
          input: iteration.assistantMessage.toolCalls?.find(
            (c) => c.id === pendingResult.toolCallId
          )?.input,
        });
        return;
      }

      if (iteration.toolResults.length === 0) {
        this.emitEvent({ type: 'turn_end' });
        return;
      }
    }

    this.emitEvent({
      type: 'error',
      message: `Exceeded max turns (${this.maxTurns})`,
    });
  }

  private emitToolResult(result: ToolResult): void {
    this.emitEvent({
      type: 'tool_result',
      name: result.name,
      output: result.content,
      isError: result.isError,
    });
  }

  private emitEvent(event: AgentEvent): void {
    this.emit('event', event);
  }
}
