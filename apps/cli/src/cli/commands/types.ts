import { Agent } from '@ihn-agent/core';
import type { McpManager } from '@ihn-agent/mcp';
import type { AgentConfig } from '@ihn-agent/types';

import type { CLIMessage } from '../../components/chat/types';

export interface CommandContext {
  agent: Agent;
  mcpManager?: McpManager | undefined;
  setMessages: (updater: (prev: CLIMessage[]) => CLIMessage[]) => void;
  messages: CLIMessage[];
  config: AgentConfig;
  onConfigChange?: ((config: AgentConfig) => void) | undefined;
  exit: () => void;
  setCurrentAgentText: (text: string) => void;
  setLoading: (loading: boolean) => void;
  commands: SlashCommand[];
}

export interface SlashCommand {
  name: string;
  description: string;
  handler: (ctx: CommandContext, args: string[]) => void | Promise<void>;
}
