import type { AgentEvent } from '@ihn-agent/types';

export type CLIMessage =
  | { type: 'user'; content: string }
  | { type: 'info'; content: string }
  | AgentEvent;
