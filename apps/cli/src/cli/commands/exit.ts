import type { SlashCommand } from './types';

export const exitCommand: SlashCommand = {
  name: '/exit',
  description: 'Exit the application',
  handler: ({ exit }) => exit(),
};

export const quitCommand: SlashCommand = {
  name: '/quit',
  description: 'Exit the application',
  handler: ({ exit }) => exit(),
};
