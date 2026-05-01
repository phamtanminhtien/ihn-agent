import type { ToolCall, ToolContext, ToolResult } from '@ihn-agent/types';

import { ToolRegistry } from './tool-registry.js';

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
    private readonly ctx: ToolContext,
    private readonly approvedToolCallIds: Set<string> = new Set()
  ) {}

  async dispatchOne(
    call: ToolCall,
    approvedToolCallIds: Set<string> = new Set()
  ): Promise<ToolResult> {
    const tool = this.registry.get(call.name);

    if (!tool) {
      return {
        toolCallId: call.id,
        name: call.name,
        isError: true,
        content: `Unknown tool: ${call.name}`,
        status: 'error',
      };
    }

    const isApproved = this.approvedToolCallIds.has(call.id) || approvedToolCallIds.has(call.id);
    if (tool.metadata.requiresConfirmation && !isApproved) {
      return {
        toolCallId: call.id,
        name: call.name,
        isError: false,
        content: 'Approval required',
        status: 'pending',
      };
    }

    try {
      const output = await tool.execute(call.input, this.ctx);
      return {
        toolCallId: call.id,
        name: call.name,
        isError: false,
        content: safeStringify(output),
        status: 'success',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        toolCallId: call.id,
        name: call.name,
        isError: true,
        content: `Tool error (${call.name}): ${message}`,
        status: 'error',
      };
    }
  }
}
