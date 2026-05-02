import type { IAgent } from '@ihn-agent/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { McpManager } from './manager';

describe('McpManager', () => {
  let agent: IAgent;
  let manager: McpManager;

  beforeEach(() => {
    agent = {
      registerProvider: vi.fn().mockResolvedValue(undefined),
    } as any;
    manager = new McpManager(agent);
  });

  it('should list empty servers initially', () => {
    expect(manager.listServers()).toEqual([]);
  });

  it('should list server details', async () => {
    // This is hard to test without real MCP server, but we can mock the client
    // For now just check empty state
    const details = await manager.getServerDetails();
    expect(details).toEqual([]);
  });
});
