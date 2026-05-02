import type { Tool, ToolContext, ToolProvider } from '@ihn-agent/types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export class McpToolProvider implements ToolProvider {
  constructor(
    public readonly name: string,
    private readonly client: Client
  ) {}

  async getTools(): Promise<Tool[]> {
    const response = await this.client.listTools();

    return response.tools.map((mcpTool) => {
      return {
        name: mcpTool.name,
        description: mcpTool.description ?? '',
        inputSchema: mcpTool.inputSchema,
        metadata: {
          requiresConfirmation: true, // All MCP tools require confirmation
          riskLevel: 'high', // Default to high for MCP tools for safety
          cacheable: false,
          retryable: false,
          provider: `mcp:${this.name}`,
        },
        execute: async (input: unknown, _ctx: ToolContext) => {
          const result = await this.client.callTool({
            name: mcpTool.name,
            arguments: input as Record<string, unknown>,
          });

          if (result.isError) {
            throw new Error(`MCP Tool Error (${mcpTool.name}): ${JSON.stringify(result.content)}`);
          }

          return result.content;
        },
      };
    });
  }
}
