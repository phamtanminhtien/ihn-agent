import type { SlashCommand } from './types';

export const configCommand: SlashCommand = {
  name: '/config',
  description: 'Show current configuration',
  handler: ({ setMessages, config }) => {
    const { apiKey, ...rest } = config;
    const maskedApiKey = apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : 'not set';

    const configStr = Object.entries({ ...rest, apiKey: maskedApiKey })
      .map(([key, value]) => `- **${key}**: \`${JSON.stringify(value)}\``)
      .join('\n');

    setMessages((prev) => [
      ...prev,
      {
        type: 'info',
        content: `### Current Configuration\n\n${configStr}`,
      },
    ]);
  },
};
