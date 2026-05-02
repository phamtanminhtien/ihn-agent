import type { SlashCommand } from './types';

export const modelCommand: SlashCommand = {
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
};
