import type { ToolContext, ToolMetadata } from '@ihn-agent/types';
import { z } from 'zod';

import { BaseTool } from '../base-tool.js';

const WebSearchSchema = z.object({
  query: z.string().describe('The search query for the web'),
});

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class WebSearchTool extends BaseTool<typeof WebSearchSchema, WebSearchResult[]> {
  name = 'web_search';
  description = 'Search the web for information.';
  schema = WebSearchSchema;
  metadata: ToolMetadata = {
    requiresConfirmation: false,
    riskLevel: 'low',
    cacheable: true,
    retryable: true,
  };

  async execute(
    input: z.infer<typeof WebSearchSchema>,
    _ctx: ToolContext
  ): Promise<WebSearchResult[]> {
    // This is a stub. In a real implementation, you would use a search API like Brave, Google, or Serper.
    console.log(`Web search requested: ${input.query}`);
    return [
      {
        title: 'Stub Search Result',
        url: 'https://example.com',
        snippet: `Information about "${input.query}" would appear here in a real implementation.`,
      },
    ];
  }
}
