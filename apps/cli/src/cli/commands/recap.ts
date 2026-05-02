import { PromptComposer, PromptRegistry, registerDefaultBlocks } from '@ihn-agent/prompt';

import type { SlashCommand } from './types';

export const recapCommand: SlashCommand = {
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
};
