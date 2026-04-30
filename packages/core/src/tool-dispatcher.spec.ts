import type { Tool, ToolContext } from '@ihn-agent/schema';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ToolDispatcher } from './tool-dispatcher.js';
import { ToolRegistry } from './tool-registry.js';

describe('ToolDispatcher', () => {
  let registry: ToolRegistry;
  let dispatcher: ToolDispatcher;
  let ctx: ToolContext;

  beforeEach(() => {
    registry = new ToolRegistry();
    ctx = { workingMemory: {} };
    dispatcher = new ToolDispatcher(registry, ctx);
  });

  it('should dispatch to a registered tool', async () => {
    const mockExecute = jest.fn<Tool['execute']>().mockResolvedValue('output_value');
    const mockTool: Tool = {
      name: 'test_tool',
      description: 'desc',
      inputSchema: {},
      metadata: {
        requiresConfirmation: false,
        riskLevel: 'safe',
        cacheable: false,
        retryable: false,
      },
      execute: mockExecute,
    };
    registry.register(mockTool);

    const result = await dispatcher.dispatchOne({
      id: 'call_1',
      name: 'test_tool',
      input: { param: 'value' },
    });

    expect(result).toEqual({
      toolCallId: 'call_1',
      name: 'test_tool',
      isError: false,
      content: 'output_value',
    });
    expect(mockExecute).toHaveBeenCalledWith({ param: 'value' }, ctx);
  });

  it('should return error for unknown tool', async () => {
    const result = await dispatcher.dispatchOne({
      id: 'call_1',
      name: 'unknown_tool',
      input: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain('Unknown tool: unknown_tool');
  });

  it('should catch and return errors from tool execution', async () => {
    const mockTool: Tool = {
      name: 'error_tool',
      description: 'desc',
      inputSchema: {},
      metadata: {
        requiresConfirmation: false,
        riskLevel: 'safe',
        cacheable: false,
        retryable: false,
      },
      execute: async () => {
        throw new Error('Explosion!');
      },
    };
    registry.register(mockTool);

    const result = await dispatcher.dispatchOne({
      id: 'call_1',
      name: 'error_tool',
      input: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain('Explosion!');
  });

  it('should stringify non-string tool outputs', async () => {
    const mockTool: Tool = {
      name: 'obj_tool',
      description: 'desc',
      inputSchema: {},
      metadata: {
        requiresConfirmation: false,
        riskLevel: 'safe',
        cacheable: false,
        retryable: false,
      },
      execute: async () => ({ foo: 'bar' }),
    };
    registry.register(mockTool);

    const result = await dispatcher.dispatchOne({
      id: 'call_1',
      name: 'obj_tool',
      input: {},
    });

    expect(result.content).toBe('{"foo":"bar"}');
  });
});
