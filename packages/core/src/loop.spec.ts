import type { ChatProvider, ProviderStream, StreamChunk } from '@ihn-agent/types';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AgentLoop } from './loop.js';
import { ToolDispatcher } from './tool-dispatcher.js';
import { ToolRegistry } from './tool-registry.js';

describe('AgentLoop', () => {
  let mockProvider: jest.Mocked<ChatProvider>;
  let dispatcher: ToolDispatcher;
  let dispatchOneMock: jest.SpiedFunction<ToolDispatcher['dispatchOne']>;
  let loop: AgentLoop;

  beforeEach(() => {
    mockProvider = {
      streamChat: jest.fn<ChatProvider['streamChat']>(),
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
    dispatchOneMock = jest.spyOn(dispatcher, 'dispatchOne');
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

    const result = await loop.runOnce([], []);

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

    const result = await loop.runOnce([], []);

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
