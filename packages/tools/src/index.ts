export * from './base-tool';
export * from './fs/edit-file';
export * from './fs/list-dir';
export * from './fs/read-file';
export * from './fs/write-file';
export * from './provider';
export * from './search/grep-search';
export * from './search/web-search';
export * from './shell/run-command';
export * from './task/task-complete';

import { EditFileTool } from './fs/edit-file';
import { ListDirTool } from './fs/list-dir';
import { ReadFileTool } from './fs/read-file';
import { WriteFileTool } from './fs/write-file';
import { GrepSearchTool } from './search/grep-search';
import { WebSearchTool } from './search/web-search';
import { RunCommandTool } from './shell/run-command';
import { TaskCompleteTool } from './task/task-complete';

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
