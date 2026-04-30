import type { ToolContext, ToolMetadata } from '@ihn-agent/types';
import * as fs from 'fs/promises';
import { z } from 'zod';

import { BaseTool } from '../base-tool.js';

const ReadFileSchema = z.object({
  path: z.string().describe('The path to the file to read'),
  encoding: z.string().optional().default('utf8').describe('The encoding to use'),
});

export class ReadFileTool extends BaseTool<typeof ReadFileSchema, string> {
  name = 'read_file';
  description = 'Read the contents of a file from the local file system.';
  schema = ReadFileSchema;
  metadata: ToolMetadata = {
    requiresConfirmation: false,
    riskLevel: 'safe',
    cacheable: true,
    retryable: true,
  };

  async execute(input: z.infer<typeof ReadFileSchema>, _ctx: ToolContext): Promise<string> {
    try {
      const content = await fs.readFile(input.path, { encoding: input.encoding as BufferEncoding });
      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read file at ${input.path}: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }
}
