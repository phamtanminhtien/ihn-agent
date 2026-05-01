import { describe, expect, it } from '@jest/globals';

import { PromptComposer } from './composer.js';
import { PromptRegistry } from './registry.js';

describe('PromptComposer', () => {
  it('should compose multiple blocks with variables', async () => {
    const registry = new PromptRegistry();
    registry.register({ name: 'b1', template: 'Block 1: {{v1}}' });
    registry.register({ name: 'b2', template: 'Block 2: {{v2}}' });

    const composer = new PromptComposer(registry);
    const result = await composer
      .addBlock('b1')
      .addBlock('b2')
      .compose({ v1: 'hello', v2: 'world' });

    expect(result).toBe('Block 1: hello\n\nBlock 2: world');
  });

  it('should throw error if block not found', () => {
    const registry = new PromptRegistry();
    const composer = new PromptComposer(registry);
    expect(() => composer.addBlock('missing')).toThrow('Prompt block "missing" not found');
  });

  it('should throw error if required variables are missing in any block', async () => {
    const registry = new PromptRegistry();
    registry.register({ name: 'b1', template: '{{v1}}' });

    const composer = new PromptComposer(registry);
    composer.addBlock('b1');

    await expect(composer.compose({})).rejects.toThrow('Variable "v1" is missing');
  });
});
