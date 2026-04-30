import type { ToolContext, ToolMetadata } from '@ihn-agent/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

import { BaseTool } from '../base-tool.js';

const execAsync = promisify(exec);

const RunCommandSchema = z.object({
  command: z.string().describe('The shell command to execute'),
  cwd: z.string().optional().describe('The working directory to run the command in'),
});

export interface RunCommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class RunCommandTool extends BaseTool<typeof RunCommandSchema, RunCommandOutput> {
  name = 'run_command';
  description = 'Execute a shell command in the local environment.';
  schema = RunCommandSchema;
  metadata: ToolMetadata = {
    requiresConfirmation: true,
    riskLevel: 'high',
    cacheable: false,
    retryable: false,
  };

  async execute(
    input: z.infer<typeof RunCommandSchema>,
    _ctx: ToolContext
  ): Promise<RunCommandOutput> {
    try {
      const { stdout, stderr } = await execAsync(input.command, {
        cwd: input.cwd,
      });

      return {
        stdout,
        stderr,
        exitCode: 0,
      };
    } catch (error: unknown) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        code?: number;
        message?: string;
      };
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || execError.message || String(error),
        exitCode: execError.code || 1,
      };
    }
  }
}
