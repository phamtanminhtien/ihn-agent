import type { Tool, ToolContext } from '@ihn-agent/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToolDispatcher } from './tool-dispatcher';
import { ToolRegistry } from './tool-registry';

describe('ToolDispatcher', () => {
  let registry: ToolRegistry;
  let dispatcher: ToolDispatcher;
  let ctx: ToolContext;

  beforeEach(() => {
    registry = new ToolRegistry();
    ctx = {
      workingMemory: {
        plan: [],
        openFiles: [],
        variables: {},
        completedSteps: [],
      },
      signal: new AbortController().signal,
    };
    dispatcher = new ToolDispatcher(registry, ctx);
  });

  it('should dispatch to a registered tool', async () => {
    const mockExecute = vi.fn<Tool['execute']>().mockResolvedValue('output_value');
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
      status: 'success',
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

  it('should require confirmation if metadata specifies it', async () => {
    const mockTool: Tool = {
      name: 'sensitive_tool',
      description: 'desc',
      inputSchema: {},
      metadata: {
        requiresConfirmation: true,
        riskLevel: 'high',
        cacheable: false,
        retryable: false,
      },
      execute: async () => 'secret',
    };
    registry.register(mockTool);

    const result = await dispatcher.dispatchOne({
      id: 'call_1',
      name: 'sensitive_tool',
      input: {},
    });

    expect(result.status).toBe('pending');
    expect(result.content).toBe('Approval required');
  });

  it('should execute sensitive tool if approved', async () => {
    const mockTool: Tool = {
      name: 'sensitive_tool',
      description: 'desc',
      inputSchema: {},
      metadata: {
        requiresConfirmation: true,
        riskLevel: 'high',
        cacheable: false,
        retryable: false,
      },
      execute: async () => 'secret',
    };
    registry.register(mockTool);

    const result = await dispatcher.dispatchOne(
      {
        id: 'call_1',
        name: 'sensitive_tool',
        input: {},
      },
      new Set(['call_1'])
    );

    expect(result.status).toBe('success');
    expect(result.content).toBe('secret');
  });
});
