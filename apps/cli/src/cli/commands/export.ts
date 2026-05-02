import type { SlashCommand } from './types';

export const exportCommand: SlashCommand = {
  name: '/export',
  description: 'Export the current conversation to a file or clipboard. Usage: /export [filename]',
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
};
