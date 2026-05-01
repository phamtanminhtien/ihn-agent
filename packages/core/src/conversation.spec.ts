import { beforeEach, describe, expect, it } from '@jest/globals';

import { ConversationHistory } from './conversation.js';

describe('ConversationHistory', () => {
  let history: ConversationHistory;

  beforeEach(() => {
    history = new ConversationHistory();
  });

  it('should start with an empty messages array', () => {
    expect(history.messages).toEqual([]);
  });

  it('should add a system message', () => {
    history.addSystem('System prompt');
    expect(history.messages).toHaveLength(1);
    expect(history.messages[0]).toEqual({ role: 'system', content: 'System prompt' });
  });

  it('should add a user message', () => {
    history.addUser('User input');
    expect(history.messages).toHaveLength(1);
    expect(history.messages[0]).toEqual({ role: 'user', content: 'User input' });
  });

  it('should add an assistant message', () => {
    history.addAssistant({
      role: 'assistant',
      content: 'Assistant response',
      stopReason: 'end_turn',
    });
    expect(history.messages).toHaveLength(1);
    expect(history.messages[0]).toEqual({
      role: 'assistant',
      content: 'Assistant response',
      stopReason: 'end_turn',
    });
  });

  it('should add tool results', () => {
    history.addToolResults([
      {
        toolCallId: 'call_1',
        name: 'tool1',
        content: 'result1',
        isError: false,
        status: 'success',
      },
    ]);
    expect(history.messages).toHaveLength(1);
    expect(history.messages[0]).toEqual({
      role: 'tool_result',
      toolCallId: 'call_1',
      name: 'tool1',
      content: 'result1',
      isError: false,
    });
  });

  it('should maintain message order', () => {
    history.addSystem('System');
    history.addUser('User');
    history.addAssistant({ role: 'assistant', content: 'Assistant', stopReason: 'end_turn' });

    expect(history.messages).toHaveLength(3);
    expect(history.messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant']);
  });
});
