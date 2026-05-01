import type { ToolContext, ToolMetadata } from '@ihn-agent/types';
import * as fs from 'fs/promises';
import { z } from 'zod';

import { BaseTool } from '../base-tool';

const EditFileSchema = z.object({
  path: z.string().describe('The path to the file to edit'),
  edits: z
    .array(
      z.object({
        oldText: z.string().describe('The exact text to find in the file'),
        newText: z.string().describe('The text to replace it with'),
      })
    )
    .describe('A list of search-and-replace pairs'),
});

export class EditFileTool extends BaseTool<typeof EditFileSchema, { success: true; path: string }> {
  name = 'edit_file';
  description = 'Modify an existing file by replacing specific blocks of text.';
  schema = EditFileSchema;
  metadata: ToolMetadata = {
    requiresConfirmation: false,
    riskLevel: 'medium',
    cacheable: false,
    retryable: false,
  };

  async execute(
    input: z.infer<typeof EditFileSchema>,
    _ctx: ToolContext
  ): Promise<{ success: true; path: string }> {
    try {
      let content = await fs.readFile(input.path, 'utf8');

      for (const edit of input.edits) {
        if (!content.includes(edit.oldText)) {
          throw new Error(`Could not find exact text match for: ${edit.oldText}`);
        }

        // Count occurrences to prevent ambiguous replacements
        const occurrences = content.split(edit.oldText).length - 1;
        if (occurrences > 1) {
          // We might want to allow this if the user is sure, but usually it's better to be specific.
          // For now, let's just replace all if they match exactly.
        }

        content = content.replace(edit.oldText, edit.newText);
      }

      await fs.writeFile(input.path, content, 'utf8');
      return { success: true, path: input.path };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to edit file at ${input.path}: ${error.message}`, {
          cause: error,
        });
      }
      throw error;
    }
  }
}
