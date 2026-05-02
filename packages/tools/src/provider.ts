import type { Tool, ToolProvider } from '@ihn-agent/types';

import { builtInTools } from './index';

export class BuiltInToolProvider implements ToolProvider {
  readonly name = 'builtin';

  async getTools(): Promise<Tool[]> {
    for (const tool of builtInTools) {
      tool.metadata.provider = this.name;
    }
    return builtInTools as Tool[];
  }
}
