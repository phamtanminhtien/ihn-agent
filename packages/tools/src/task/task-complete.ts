import type { ToolContext, ToolMetadata } from '@ihn-agent/types';
import { z } from 'zod';

import { BaseTool } from '../base-tool.js';

const TaskCompleteSchema = z.object({
  summary: z.string().describe('A brief summary of what was accomplished'),
  output: z.any().optional().describe('Final output or result of the task'),
});

export class TaskCompleteTool extends BaseTool<typeof TaskCompleteSchema, { success: true }> {
  name = 'task_complete';
  description = 'Signal that the assigned task is finished.';
  schema = TaskCompleteSchema;
  metadata: ToolMetadata = {
    requiresConfirmation: false,
    riskLevel: 'safe',
    cacheable: false,
    retryable: false,
  };

  async execute(
    _input: z.infer<typeof TaskCompleteSchema>,
    _ctx: ToolContext
  ): Promise<{ success: true }> {
    // This tool is primarily a signal for the agent loop to stop.
    return { success: true };
  }
}
