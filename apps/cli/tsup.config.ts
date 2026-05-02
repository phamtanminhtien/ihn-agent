import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  clean: true,
  dts: false,
  noExternal: [
    '@ihn-agent/core',
    '@ihn-agent/providers',
    '@ihn-agent/prompt',
    '@ihn-agent/tools',
    '@ihn-agent/types',
  ],
});
