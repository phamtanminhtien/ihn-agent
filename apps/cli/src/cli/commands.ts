import { Agent } from '@ihn-agent/core';
import type { AgentConfig } from '@ihn-agent/types';

import type { CLIMessage } from '../components/chat/chat-interface';

export interface CommandContext {
  agent: Agent;
  setMessages: (updater: (prev: CLIMessage[]) => CLIMessage[]) => void;
  config: AgentConfig;
  onConfigChange?: ((config: AgentConfig) => void) | undefined;
  exit: () => void;
}

export interface SlashCommand {
  name: string;
  description: string;
  handler: (ctx: CommandContext, args: string[]) => void | Promise<void>;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: '/clear',
    description: 'Clear the terminal UI messages',
    handler: ({ setMessages }) => {
      setMessages(() => []);
    },
  },
  {
    name: '/reset',
    description: 'Reset agent history and clear UI',
    handler: ({ agent, setMessages }) => {
      agent.reset();
      setMessages(() => [{ type: 'info', content: 'Conversation history has been reset.' }]);
    },
  },
  {
    name: '/help',
    description: 'Show available commands',
    handler: ({ setMessages }) => {
      setMessages((prev) => [
        ...prev,
        {
          type: 'info',
          content:
            '**Available Commands:**\n\n' +
            SLASH_COMMANDS.map((c) => `- \`${c.name}\`: ${c.description}`).join('\n'),
        },
      ]);
    },
  },
  {
    name: '/model',
    description: 'Show or switch the current model. Usage: /model <model_name> or /model',
    handler: async ({ agent, setMessages, config, onConfigChange }, args) => {
      if (args.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            type: 'info',
            content: `Current model: **${agent.getModel()}**`,
          },
        ]);
        return;
      }

      const newModel = args[0];
      if (!newModel) return;

      agent.setModel(newModel);
      if (onConfigChange) {
        onConfigChange({
          ...config,
          model: newModel,
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          type: 'info',
          content: `Model switched to: **${newModel}**`,
        },
      ]);
    },
  },
  {
    name: '/exit',
    description: 'Exit the application',
    handler: ({ exit }) => exit(),
  },
  {
    name: '/quit',
    description: 'Exit the application',
    handler: ({ exit }) => exit(),
  },
];
