import type { ChatProvider, ProviderStream, StreamChunk } from '@ihn-agent/types';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { Agent } from './agent.js';

describe('Agent', () => {
  let mockProvider: jest.Mocked<ChatProvider>;

  beforeEach(() => {
    mockProvider = {
      streamChat: jest.fn<ChatProvider['streamChat']>(),
    };
  });

  it('should run a simple conversation', async () => {
    const agent = new Agent({ provider: mockProvider });
    const mockChunks: StreamChunk[] = [
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' world!' },
    ];

    const mockStream: ProviderStream = {
      async *[Symbol.asyncIterator]() {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      },
    };

    mockProvider.streamChat.mockResolvedValue(mockStream);

    const chunks: StreamChunk[] = [];
    const eventHandler = jest.fn();
    agent.on('event', eventHandler);

    for await (const chunk of agent.run('Hi')) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(mockChunks);
    expect(eventHandler).toHaveBeenCalledWith({ type: 'text_delta', content: 'Hello' });
    expect(eventHandler).toHaveBeenCalledWith({ type: 'text_delta', content: ' world!' });
    expect(eventHandler).toHaveBeenCalledWith({ type: 'turn_end' });
  });

  it('should respect maxTurns', async () => {
    const agent = new Agent({ provider: mockProvider, maxTurns: 1 });

    // Mock a tool call to trigger another turn
    const toolCallChunk: StreamChunk = {
      type: 'tool_use',
      call: { id: 'call_1', name: 'test_tool', input: {} },
    };

    const mockStream: ProviderStream = {
      async *[Symbol.asyncIterator]() {
        yield toolCallChunk;
      },
    };

    mockProvider.streamChat.mockResolvedValue(mockStream);

    const eventHandler = jest.fn();
    agent.on('event', eventHandler);

    // Run the agent. It should stop after 1 turn because maxTurns=1
    // but here the code logic actually finishes the turn and then checks.
    // Let's see how agent.ts is implemented.
    // while (turns < this.maxTurns) { turns += 1; ... }
    // So if maxTurns is 1, it runs once, then turns becomes 1, and the loop terminates.

    for await (const _ of agent.run('Hi')) {
      // Consume chunks to trigger turns and events
    }

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: 'Exceeded max turns (1)',
      })
    );
  });
});
