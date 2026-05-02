import type { SlashCommand } from './types';

export const copyCommand: SlashCommand = {
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
};
