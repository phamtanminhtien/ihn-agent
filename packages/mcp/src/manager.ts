import type { IAgent, McpServerConfig } from '@ihn-agent/types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { McpToolProvider } from './provider';

export class McpManager {
  private clients: Map<string, { client: Client; transport: StdioClientTransport }> = new Map();

  constructor(private readonly agent: IAgent) {}

  async loadServers(configs: McpServerConfig[]): Promise<void> {
    for (const config of configs) {
      try {
        await this.addServer(config);
      } catch (error) {
        console.error(`Failed to load MCP server ${config.name}:`, error);
      }
    }
  }

  async addServer(config: McpServerConfig): Promise<void> {
    if (this.clients.has(config.name)) {
      throw new Error(`MCP server ${config.name} already exists`);
    }

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      ...(config.env ? { env: config.env } : {}),
    });

    const client = new Client({ name: 'ihn-agent', version: '1.0.0' }, { capabilities: {} });

    await client.connect(transport);

    this.clients.set(config.name, { client, transport });

    const provider = new McpToolProvider(config.name, client);
    await this.agent.registerProvider(provider);
  }

  async removeServer(name: string): Promise<void> {
    const entry = this.clients.get(name);
    if (!entry) {
      throw new Error(`MCP server ${name} not found`);
    }

    await entry.client.close();
    this.clients.delete(name);

    // Note: ToolRegistry currently doesn't support unregistering tools or providers easily.
    // For now, we just close the client. The tools will stay in the registry but fail on execution.
    // TODO: Implement unregisterProvider in ToolRegistry
  }

  listServers(): string[] {
    return Array.from(this.clients.keys());
  }

  async getServerDetails(): Promise<{ name: string; tools: string[] }[]> {
    const details = [];
    for (const [name, { client }] of this.clients.entries()) {
      try {
        const response = await client.listTools();
        details.push({
          name,
          tools: response.tools.map((t) => t.name),
        });
      } catch (error) {
        details.push({
          name,
          tools: [`Error listing tools: ${error instanceof Error ? error.message : String(error)}`],
        });
      }
    }
    return details;
  }

  async closeAll(): Promise<void> {
    for (const { client } of this.clients.values()) {
      await client.close();
    }
    this.clients.clear();
  }
}
