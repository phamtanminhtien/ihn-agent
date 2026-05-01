import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts'],
    alias: {
      '@ihn-agent/core': './packages/core/src',
      '@ihn-agent/types': './packages/types/src',
      '@ihn-agent/providers': './packages/providers/src',
      '@ihn-agent/tools': './packages/tools/src',
      '@ihn-agent/prompt': './packages/prompt/src',
    },
  },
});
