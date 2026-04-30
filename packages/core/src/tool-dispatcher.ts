import type { ToolCall, ToolResult } from './conversation.types.js';
import { ToolRegistry } from './tool-registry.js';
import type { ToolContext } from './tool-registry.types.js';

function safeStringify(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export class ToolDispatcher {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly ctx: ToolContext
  ) {}

  async dispatchOne(call: ToolCall): Promise<ToolResult> {
    const tool = this.registry.get(call.name);

    if (!tool) {
      return {
        toolCallId: call.id,
        name: call.name,
        isError: true,
        content: `Unknown tool: ${call.name}`,
      };
    }

    try {
      const output = await tool.execute(call.input, this.ctx);
      return {
        toolCallId: call.id,
        name: call.name,
        isError: false,
        content: safeStringify(output),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        toolCallId: call.id,
        name: call.name,
        isError: true,
        content: `Tool error (${call.name}): ${message}`,
      };
    }
  }
}
