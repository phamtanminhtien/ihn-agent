import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  clean: true,
  dts: false,
  splitting: false,
  noExternal: [
    '@ihn-agent/core',
    '@ihn-agent/providers',
    '@ihn-agent/prompt',
    '@ihn-agent/tools',
    '@ihn-agent/types',
    '@ihn-agent/mcp',
    '@ihn-agent/cache',
    'ink',
    'react',
    'react-devtools-core',
  ],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  platform: 'node',
  external: ['punycode'],
});
