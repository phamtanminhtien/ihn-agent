import type { SlashCommand } from './types';

export const clearCommand: SlashCommand = {
  name: '/clear',
  description: 'Clear the terminal UI messages',
  handler: ({ setMessages }) => {
    setMessages(() => []);
  },
};
