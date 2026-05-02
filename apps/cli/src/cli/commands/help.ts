import type { SlashCommand } from './types';

export const helpCommand: SlashCommand = {
  name: '/help',
  description: 'Show available commands',
  handler: ({ setMessages, commands }) => {
    setMessages((prev) => [
      ...prev,
      {
        type: 'info',
        content:
          '**Available Commands:**\n\n' +
          commands.map((c) => `- \`${c.name}\`: ${c.description}`).join('\n'),
      },
    ]);
  },
};
