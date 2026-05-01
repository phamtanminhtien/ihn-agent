import type { PromptBlock } from '@ihn-agent/types';

export class PromptRegistry {
  private readonly blocks = new Map<string, PromptBlock>();

  register(block: PromptBlock): void {
    this.blocks.set(block.name, block);
  }

  get(name: string): PromptBlock | undefined {
    return this.blocks.get(name);
  }

  list(): string[] {
    return Array.from(this.blocks.keys());
  }
}
