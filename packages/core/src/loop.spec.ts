import type { ChatProvider, ProviderStream, StreamChunk } from '@ihn-agent/types';
import { beforeEach, describe, expect, it, type Mocked, type MockInstance, vi } from 'vitest';

import { AgentLoop } from './loop';
import { ToolDispatcher } from './tool-dispatcher';
import { ToolRegistry } from './tool-registry';

describe('AgentLoop', () => {
  let mockProvider: Mocked<ChatProvider>;
  let dispatcher: ToolDispatcher;
  let dispatchOneMock: MockInstance<ToolDispatcher['dispatchOne']>;
  let loop: AgentLoop;

  beforeEach(() => {
    mockProvider = {
      streamChat: vi.fn<ChatProvider['streamChat']>(),
      setModel: vi.fn(),
      getModel: vi.fn().mockReturnValue('test-model'),
    };
    dispatcher = new ToolDispatcher(new ToolRegistry(), {
      workingMemory: {
        plan: [],
        openFiles: [],
        variables: {},
        completedSteps: [],
      },
      signal: new AbortController().signal,
    });
    dispatchOneMock = vi.spyOn(dispatcher, 'dispatchOne');
    loop = new AgentLoop(mockProvider, dispatcher);
  });

  it('should run an iteration without tool calls', async () => {
    const mockChunks: StreamChunk[] = [{ type: 'text', content: 'Response' }];
    const mockStream: ProviderStream = {
      async *[Symbol.asyncIterator]() {
        for (const chunk of mockChunks) yield chunk;
      },
    };
    mockProvider.streamChat.mockResolvedValue(mockStream);

    const iterator = loop.runOnce([], []);
    const chunks: StreamChunk[] = [];
    let next = await iterator.next();
    while (!next.done) {
      chunks.push(next.value);
      next = await iterator.next();
    }
    const result = next.value;

    expect(chunks).toEqual(mockChunks);
    expect(result.chunks).toEqual(mockChunks);
    expect(result.assistantMessage.content).toBe('Response');
    expect(result.toolResults).toEqual([]);
    expect(dispatchOneMock).not.toHaveBeenCalled();
  });

  it('should run an iteration with tool calls and dispatch them', async () => {
    const mockChunks: StreamChunk[] = [
      { type: 'tool_use', call: { id: 'call_1', name: 'tool1', input: {} } },
    ];
    const mockStream: ProviderStream = {
      async *[Symbol.asyncIterator]() {
        for (const chunk of mockChunks) yield chunk;
      },
    };
    mockProvider.streamChat.mockResolvedValue(mockStream);
    dispatchOneMock.mockResolvedValue({
      toolCallId: 'call_1',
      name: 'tool1',
      content: 'result1',
      isError: false,
      status: 'success',
    });

    const iterator = loop.runOnce([], []);
    let next = await iterator.next();
    while (!next.done) {
      next = await iterator.next();
    }
    const result = next.value;

    expect(result.assistantMessage.toolCalls).toHaveLength(1);
    expect(dispatchOneMock).toHaveBeenCalledWith(
      {
        id: 'call_1',
        name: 'tool1',
        input: {},
      },
      expect.any(Set)
    );
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults[0]!.content).toBe('result1');
  });
});
