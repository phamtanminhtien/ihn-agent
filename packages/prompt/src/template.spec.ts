import { describe, expect, it } from 'vitest';

import { PromptTemplate } from './template';

describe('PromptTemplate', () => {
  it('should interpolate simple variables', () => {
    const template = new PromptTemplate('Hello {{name}}!');
    const result = template.format({ name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('should interpolate nested variables', () => {
    const template = new PromptTemplate('OS: {{env.os}}, User: {{user.name}}');
    const result = template.format({
      env: { os: 'Linux' },
      user: { name: 'Alice' },
    });
    expect(result).toBe('OS: Linux, User: Alice');
  });

  it('should throw error for missing variables', () => {
    const template = new PromptTemplate('Hello {{name}}!');
    expect(() => template.format({})).toThrow('Variable "name" is missing');
  });

  it('should support partial application', () => {
    const template = new PromptTemplate('{{greeting}} {{name}}!');
    const partial = template.partial({ greeting: 'Hello' });
    expect(partial.raw).toBe('Hello {{name}}!');

    const final = partial.format({ name: 'World' });
    expect(final).toBe('Hello World!');
  });

  it('should handle multiple occurrences of the same variable', () => {
    const template = new PromptTemplate('{{name}} likes {{name}}.');
    const result = template.format({ name: 'Alice' });
    expect(result).toBe('Alice likes Alice.');
  });
});
