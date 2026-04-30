import type { ToolContext, ToolMetadata } from '@ihn-agent/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

import { BaseTool } from '../base-tool.js';

const WriteFileSchema = z.object({
  path: z.string().describe('The path to the file to write'),
  content: z.string().describe('The content to write to the file'),
  overwrite: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to overwrite if the file already exists'),
});

export class WriteFileTool extends BaseTool<
  typeof WriteFileSchema,
  { success: true; path: string }
> {
  name = 'write_file';
  description = 'Create a new file or overwrite an existing one with the provided content.';
  schema = WriteFileSchema;
  metadata: ToolMetadata = {
    requiresConfirmation: true,
    riskLevel: 'medium',
    cacheable: false,
    retryable: false,
  };

  async execute(
    input: z.infer<typeof WriteFileSchema>,
    _ctx: ToolContext
  ): Promise<{ success: true; path: string }> {
    try {
      // Ensure the directory exists
      const dir = path.dirname(input.path);
      await fs.mkdir(dir, { recursive: true });

      if (!input.overwrite) {
        try {
          await fs.access(input.path);
          throw new Error(`File already exists at ${input.path} and overwrite is disabled.`);
        } catch (error: unknown) {
          if ((error as { code?: string }).code !== 'ENOENT') throw error;
        }
      }

      await fs.writeFile(input.path, input.content, 'utf8');
      return { success: true, path: input.path };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to write file at ${input.path}: ${error.message}`, {
          cause: error,
        });
      }
      throw error;
    }
  }
}
