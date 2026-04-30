import { EventEmitter } from 'node:events';

import type {
  AgentEvent,
  AgentOptions,
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

  constructor(options: AgentOptions) {
    super();

    const dispatcher = new ToolDispatcher(this.registry, {
      workingMemory: {
        plan: [],
        openFiles: [],
        variables: {},
        completedSteps: [],
      },
      signal: new AbortController().signal,
      ...options.toolContext,
    });
    this.loop = new AgentLoop(options.provider, dispatcher);
    this.maxTurns = options.maxTurns ?? 8;
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

  async *run(userMessage: string): AsyncGenerator<StreamChunk> {
    this.conversation.addUser(userMessage);
    let turns = 0;

    while (turns < this.maxTurns) {
      turns += 1;
      const iteration = await this.loop.runOnce(
        this.conversation.messages,
        this.registry.getSchemas()
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

      this.conversation.addAssistant(iteration.assistantMessage);

      if (iteration.toolResults.length === 0) {
        this.emitEvent({ type: 'turn_end' });
        return;
      }

      this.conversation.addToolResults(iteration.toolResults);
      for (const result of iteration.toolResults) {
        this.emitToolResult(result);
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
