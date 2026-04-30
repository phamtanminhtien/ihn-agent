import type { Tool } from '@ihn-agent/schema';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { ToolRegistry } from './tool-registry.js';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register and get a tool', () => {
    const mockTool: Tool = {
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: { type: 'object', properties: {} },
      metadata: {
        requiresConfirmation: false,
        riskLevel: 'safe',
        cacheable: false,
        retryable: false,
      },
      execute: async () => 'success',
    };

    registry.register(mockTool);
    expect(registry.get('test_tool')).toBe(mockTool);
  });

  it('should return undefined for non-existent tool', () => {
    expect(registry.get('non_existent')).toBeUndefined();
  });

  it('should return schemas for all registered tools', () => {
    const tool1: Tool = {
      name: 'tool1',
      description: 'desc1',
      inputSchema: { type: 'object' },
      metadata: {
        requiresConfirmation: false,
        riskLevel: 'safe',
        cacheable: false,
        retryable: false,
      },
      execute: async () => '1',
    };
    const tool2: Tool = {
      name: 'tool2',
      description: 'desc2',
      inputSchema: { type: 'object' },
      metadata: {
        requiresConfirmation: false,
        riskLevel: 'safe',
        cacheable: false,
        retryable: false,
      },
      execute: async () => '2',
    };

    registry.register(tool1);
    registry.register(tool2);

    const schemas = registry.getSchemas();
    expect(schemas).toHaveLength(2);
    expect(schemas).toContainEqual({
      name: 'tool1',
      description: 'desc1',
      inputSchema: { type: 'object' },
    });
    expect(schemas).toContainEqual({
      name: 'tool2',
      description: 'desc2',
      inputSchema: { type: 'object' },
    });
  });
});
