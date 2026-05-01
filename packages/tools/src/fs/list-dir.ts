import type { ToolContext, ToolMetadata } from '@ihn-agent/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

import { BaseTool } from '../base-tool';

const ListDirSchema = z.object({
  path: z.string().describe('The directory path to list'),
  recursive: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to list subdirectories recursively'),
});

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  size?: number | undefined;
  path: string;
}

export class ListDirTool extends BaseTool<typeof ListDirSchema, FileEntry[]> {
  name = 'list_dir';
  description = 'List the contents of a directory.';
  schema = ListDirSchema;
  metadata: ToolMetadata = {
    requiresConfirmation: false,
    riskLevel: 'safe',
    cacheable: true,
    retryable: true,
  };

  async execute(input: z.infer<typeof ListDirSchema>, _ctx: ToolContext): Promise<FileEntry[]> {
    try {
      const entries: FileEntry[] = [];
      await this.scanDir(input.path, input.recursive, entries);
      return entries;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to list directory at ${input.path}: ${error.message}`, {
          cause: error,
        });
      }
      throw error;
    }
  }

  private async scanDir(dirPath: string, recursive: boolean, result: FileEntry[]): Promise<void> {
    const files = await fs.readdir(dirPath, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      const isDirectory = file.isDirectory();

      let size: number | undefined;
      if (!isDirectory) {
        const stats = await fs.stat(fullPath);
        size = stats.size;
      }

      result.push({
        name: file.name,
        isDirectory,
        size,
        path: fullPath,
      });

      if (recursive && isDirectory) {
        await this.scanDir(fullPath, recursive, result);
      }
    }
  }
}
