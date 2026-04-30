export * from './base-tool.js';
export * from './fs/edit-file.js';
export * from './fs/list-dir.js';
export * from './fs/read-file.js';
export * from './fs/write-file.js';
export * from './search/grep-search.js';
export * from './search/web-search.js';
export * from './shell/run-command.js';
export * from './task/task-complete.js';

import { EditFileTool } from './fs/edit-file.js';
import { ListDirTool } from './fs/list-dir.js';
import { ReadFileTool } from './fs/read-file.js';
import { WriteFileTool } from './fs/write-file.js';
import { GrepSearchTool } from './search/grep-search.js';
import { WebSearchTool } from './search/web-search.js';
import { RunCommandTool } from './shell/run-command.js';
import { TaskCompleteTool } from './task/task-complete.js';

export const builtInTools = [
  new ReadFileTool(),
  new ListDirTool(),
  new WriteFileTool(),
  new EditFileTool(),
  new GrepSearchTool(),
  new WebSearchTool(),
  new RunCommandTool(),
  new TaskCompleteTool(),
];
