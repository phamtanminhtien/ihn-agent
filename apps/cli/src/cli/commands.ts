import { Agent } from '@ihn-agent/core';
import { PromptComposer, PromptRegistry, registerDefaultBlocks } from '@ihn-agent/prompt';
import type { AgentConfig } from '@ihn-agent/types';

import type { CLIMessage } from '../components/chat/chat-interface';

export interface CommandContext {
  agent: Agent;
  setMessages: (updater: (prev: CLIMessage[]) => CLIMessage[]) => void;
  messages: CLIMessage[];
  config: AgentConfig;
  onConfigChange?: ((config: AgentConfig) => void) | undefined;
  exit: () => void;
  setCurrentAgentText: (text: string) => void;
  setLoading: (loading: boolean) => void;
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
  },

  {
    name: '/copy',
    description: 'Copy last response to clipboard (or /copy N for the Nth-latest)',
    handler: async ({ messages, setMessages }, args) => {
      const agentMessages = messages.filter((m) => m.type === 'text_delta');

      if (agentMessages.length === 0) {
        setMessages((prev) => [
          ...prev,
          { type: 'info', content: 'No agent responses found to copy.' },
        ]);
        return;
      }

      let index = 1;
      if (args.length > 0) {
        const n = parseInt(args[0] || '1', 10);
        if (!isNaN(n) && n > 0) {
          index = n;
        }
      }

      const targetIndex = agentMessages.length - index;
      const targetMsg = agentMessages[targetIndex] as { content: string } | undefined;

      if (!targetMsg) {
        setMessages((prev) => [
          ...prev,
          { type: 'info', content: `No response found at index ${index}.` },
        ]);
        return;
      }

      try {
        const { execSync } = await import('child_process');
        execSync('pbcopy', { input: targetMsg.content });

        setMessages((prev) => [
          ...prev,
          {
            type: 'info',
            content: `Copied ${index === 1 ? 'last' : `${index}th-latest`} response to clipboard.`,
          },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            type: 'info',
            content: `Failed to copy to clipboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ]);
      }
    },
  },
  {
    name: '/export',
    description:
      'Export the current conversation to a file or clipboard. Usage: /export [filename]',
    handler: async ({ messages, setMessages }, args) => {
      const formatted = messages
        .map((msg) => {
          switch (msg.type) {
            case 'user':
              return `### 👤 User\n\n${msg.content}`;
            case 'text_delta':
              return `### 🤖 Agent\n\n${msg.content}`;
            case 'thinking':
              return `> **💭 Thinking**: ${msg.content}`;
            case 'tool_start':
              return `> **🛠 Tool Call**: \`${msg.name}\`\n> **Input**: \`${JSON.stringify(msg.input)}\``;
            case 'tool_result':
              return `> **✅ Tool Result**: \`${msg.name}\`\n> ${msg.isError ? '**Error**: ' : ''}\`${JSON.stringify(msg.output)}\``;
            case 'error':
              return `### ❌ Error\n\n${msg.message}`;
            case 'info':
              return `### ℹ️ System\n\n${msg.content}`;
            default:
              return '';
          }
        })
        .filter(Boolean)
        .join('\n\n---\n\n');

      const filename = args[0];

      if (!filename) {
        try {
          const { execSync } = await import('child_process');
          execSync('pbcopy', { input: formatted });
          setMessages((prev) => [
            ...prev,
            { type: 'info', content: 'Conversation exported to **clipboard**.' },
          ]);
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            { type: 'info', content: 'Failed to export to clipboard.' },
          ]);
        }
      } else {
        try {
          const { writeFile } = await import('fs/promises');
          await writeFile(filename, formatted, 'utf8');
          setMessages((prev) => [
            ...prev,
            { type: 'info', content: `Conversation exported to **${filename}**.` },
          ]);
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            {
              type: 'info',
              content: `Failed to export to file **${filename}**: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ]);
        }
      }
    },
  },
  {
    name: '/recap',
    description: 'Generate a one-line session recap',
    handler: async ({ agent, setMessages, setCurrentAgentText, setLoading }) => {
      setMessages((prev) => [...prev, { type: 'info', content: '✨ Generating session recap...' }]);
      setLoading(true);

      try {
        const registry = new PromptRegistry();
        registerDefaultBlocks(registry);
        const composer = new PromptComposer(registry);
        const prompt = await composer.addBlock('commands/recap').compose({});

        let accumulated = '';
        for await (const chunk of agent.summarize(prompt)) {
          if (chunk.type === 'text') {
            accumulated += chunk.content;
            setCurrentAgentText(accumulated);
          }
        }

        if (accumulated) {
          setMessages((prev) => [...prev, { type: 'text_delta', content: accumulated }]);
          setCurrentAgentText('');
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            type: 'info',
            content: error instanceof Error ? error.message : 'Failed to generate recap.',
          },
        ]);
      } finally {
        setLoading(false);
      }
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
