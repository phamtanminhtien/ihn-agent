import { clearCommand } from './clear';
import { configCommand } from './config';
import { copyCommand } from './copy';
import { exitCommand, quitCommand } from './exit';
import { exportCommand } from './export';
import { helpCommand } from './help';
import { mcpCommand } from './mcp';
import { modelCommand } from './model';
import { recapCommand } from './recap';
import { resetCommand } from './reset';
import type { SlashCommand } from './types';

export * from './types';

export const SLASH_COMMANDS: SlashCommand[] = [
  clearCommand,
  resetCommand,
  helpCommand,
  modelCommand,
  configCommand,
  copyCommand,
  exportCommand,
  recapCommand,
  mcpCommand,
  exitCommand,
  quitCommand,
];
