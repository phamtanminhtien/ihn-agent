import type { ToolContext, ToolMetadata } from '@ihn-agent/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

import { BaseTool } from '../base-tool';

const execAsync = promisify(exec);

const GrepSearchSchema = z.object({
  query: z.string().describe('The search pattern (regex supported by grep)'),
  path: z.string().optional().default('.').describe('The directory or file to search in'),
  include: z.string().optional().describe('File pattern to include (e.g. "*.ts")'),
  exclude: z.string().optional().describe('File pattern to exclude (e.g. "node_modules")'),
});

export interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

export class GrepSearchTool extends BaseTool<typeof GrepSearchSchema, GrepMatch[]> {
  name = 'grep_search';
  description = 'Search for a pattern in the codebase using grep.';
  schema = GrepSearchSchema;
  metadata: ToolMetadata = {
    requiresConfirmation: false,
    riskLevel: 'safe',
    cacheable: true,
    retryable: true,
  };

  async execute(input: z.infer<typeof GrepSearchSchema>, _ctx: ToolContext): Promise<GrepMatch[]> {
    try {
      let command = `grep -rnE "${input.query}" "${input.path}"`;

      // Note: Basic grep might not support advanced patterns as well as ripgrep
      // but it's more likely to be available.

      if (input.exclude) {
        command += ` --exclude-dir="${input.exclude}"`;
      }

      const { stdout } = await execAsync(command).catch((err) => {
        // grep returns 1 if no matches found, which exec treats as an error
        if (err.code === 1) return { stdout: '' };
        throw err;
      });

      const matches: GrepMatch[] = stdout
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => {
          const [file, lineNumber, ...rest] = line.split(':');
          return {
            file: file || '',
            line: parseInt(lineNumber || '0', 10),
            content: rest.join(':').trim(),
          };
        });

      return matches;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Grep search failed: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }
}
