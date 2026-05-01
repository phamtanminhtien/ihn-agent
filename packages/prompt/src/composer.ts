import type { IPromptComposer, PromptVariables } from '@ihn-agent/types';

import { PromptRegistry } from './registry';
import { PromptTemplate } from './template';

export class PromptComposer implements IPromptComposer {
  private readonly blockNames: string[] = [];

  constructor(private readonly registry: PromptRegistry) {}

  addBlock(name: string): this {
    if (!this.registry.get(name)) {
      throw new Error(`Prompt block "${name}" not found in registry`);
    }
    this.blockNames.push(name);
    return this;
  }

  async compose(variables: PromptVariables): Promise<string> {
    const sections = this.blockNames.map((name) => {
      const block = this.registry.get(name)!;
      const template = new PromptTemplate(block.template);
      return template.format(variables);
    });

    return sections.join('\n\n');
  }
}
