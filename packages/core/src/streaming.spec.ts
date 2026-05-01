import { beforeEach, describe, expect, it } from 'vitest';

import { StreamingHandler } from './streaming';

describe('StreamingHandler', () => {
  let handler: StreamingHandler;

  beforeEach(() => {
    handler = new StreamingHandler();
  });

  it('should handle text chunks', () => {
    handler.consume({ type: 'text', content: 'Hello' });
    handler.consume({ type: 'text', content: ' World' });

    const message = handler.finalMessage();
    expect(message.content).toBe('Hello World');
    expect(message.stopReason).toBe('end_turn');
  });

  it('should handle thinking chunks and prepend them', () => {
    handler.consume({ type: 'thinking', content: 'I am thinking' });
    handler.consume({ type: 'text', content: 'Hello' });

    const message = handler.finalMessage();
    expect(message.content).toBe('I am thinking\nHello');
  });

  it('should handle tool use chunks and set stopReason', () => {
    handler.consume({ type: 'text', content: 'Using tool...' });
    handler.consume({
      type: 'tool_use',
      call: { id: 'call_1', name: 'my_tool', input: {} },
    });

    const message = handler.finalMessage();
    expect(message.stopReason).toBe('tool_use');
    expect(message.toolCalls).toHaveLength(1);
    expect(message.toolCalls?.[0]).toEqual({ id: 'call_1', name: 'my_tool', input: {} });
  });

  it('should handle multiple tool calls', () => {
    handler.consume({
      type: 'tool_use',
      call: { id: 'call_1', name: 'tool1', input: {} },
    });
    handler.consume({
      type: 'tool_use',
      call: { id: 'call_2', name: 'tool2', input: {} },
    });

    const message = handler.finalMessage();
    expect(message.toolCalls).toHaveLength(2);
  });
});
