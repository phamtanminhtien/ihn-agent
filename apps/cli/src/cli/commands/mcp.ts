import type { SlashCommand } from './types';

export const mcpCommand: SlashCommand = {
  name: '/mcp',
  description: 'Manage MCP servers (list, add, remove)',
  handler: async (ctx, args) => {
    const { mcpManager, setMessages } = ctx;

    if (!mcpManager) {
      setMessages((prev) => [...prev, { type: 'error', message: 'MCP Manager not initialized' }]);
      return;
    }

    const subCommand = args[0];

    switch (subCommand) {
      case 'list': {
        const serverDetails = await mcpManager.getServerDetails();
        if (serverDetails.length === 0) {
          setMessages((prev) => [...prev, { type: 'info', content: 'No MCP servers connected.' }]);
        } else {
          const content = serverDetails
            .map((s) => {
              const toolsStr = s.tools.map((t) => `  - ${t}`).join('\n');
              return `📦 ${s.name}\n${toolsStr}`;
            })
            .join('\n\n');

          setMessages((prev) => [
            ...prev,
            {
              type: 'info',
              content: `Connected MCP Servers:\n\n${content}`,
            },
          ]);
        }
        break;
      }

      case 'add': {
        const name = args[1];
        const command = args[2];
        const serverArgs = args.slice(3);

        if (!name || !command) {
          setMessages((prev) => [
            ...prev,
            { type: 'error', message: 'Usage: /mcp add <name> <command> [args...]' },
          ]);
          return;
        }

        try {
          ctx.setLoading(true);
          await mcpManager.addServer({ name, command, args: serverArgs });

          // Persist to config
          if (ctx.onConfigChange) {
            const newMcpServers = [
              ...(ctx.config.mcpServers || []),
              { name, command, args: serverArgs },
            ];
            ctx.onConfigChange({
              ...ctx.config,
              mcpServers: newMcpServers,
            });
          }

          setMessages((prev) => [
            ...prev,
            { type: 'info', content: `Successfully added MCP server: ${name}` },
          ]);
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            {
              type: 'error',
              message: `Failed to add MCP server: ${error instanceof Error ? error.message : String(error)}`,
            },
          ]);
        } finally {
          ctx.setLoading(false);
        }
        break;
      }

      case 'remove': {
        const name = args[1];
        if (!name) {
          setMessages((prev) => [...prev, { type: 'error', message: 'Usage: /mcp remove <name>' }]);
          return;
        }

        try {
          await mcpManager.removeServer(name);

          // Persist to config
          if (ctx.onConfigChange) {
            const newMcpServers = (ctx.config.mcpServers || []).filter((s) => s.name !== name);
            ctx.onConfigChange({
              ...ctx.config,
              mcpServers: newMcpServers,
            });
          }

          setMessages((prev) => [
            ...prev,
            { type: 'info', content: `Successfully removed MCP server: ${name}` },
          ]);
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            {
              type: 'error',
              message: `Failed to remove MCP server: ${error instanceof Error ? error.message : String(error)}`,
            },
          ]);
        }
        break;
      }

      default:
        setMessages((prev) => [
          ...prev,
          {
            type: 'info',
            content:
              'Usage:\n- `/mcp list`: List connected servers\n- `/mcp add <name> <command> [args...]`: Add a new server\n- `/mcp remove <name>`: Remove a server',
          },
        ]);
    }
  },
};
