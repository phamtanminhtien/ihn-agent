import type { SlashCommand } from './types';

export const resetCommand: SlashCommand = {
  name: '/reset',
  description: 'Reset agent history and clear UI',
  handler: ({ agent, setMessages }) => {
    agent.reset();
    setMessages(() => [{ type: 'info', content: 'Conversation history has been reset.' }]);
  },
};
