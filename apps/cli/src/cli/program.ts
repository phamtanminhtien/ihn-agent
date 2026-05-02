import fs from 'node:fs';
import path from 'node:path';

import { ConfigLoader } from '@ihn-agent/core';
import type { AgentConfig } from '@ihn-agent/types';
import { Command } from 'commander';

const program = new Command();
program
  .name('ihn')
  .description('IHN Agent CLI')
  .option('-p, --provider <name>', 'LLM provider (anthropic, openai, gemini)')
  .option('-m, --model <name>', 'Model name')
  .option('-k, --api-key <key>', 'API key')
  .option('-b, --base-url <url>', 'API base URL')
  .option('-t, --max-turns <n>', 'Maximum turns', (v) => parseInt(v, 10))
  .option('-i, --prompt <string>', 'Initial prompt')
  .option('--onboarding', 'Force re-configuration')
  .argument('[path]', 'Working directory', '.')
  .parse(process.argv);

const options = program.opts();
const targetPath = program.args[0] || '.';

// Change working directory if specified
if (targetPath !== '.') {
  const absolutePath = path.resolve(targetPath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) {
    console.error(`Error: Directory not found: ${absolutePath}`);
    process.exit(1);
  }
  process.chdir(absolutePath);
}

export const initialPrompt = options.prompt;
export const forceOnboarding = !!options.onboarding;

// Try to load initial config
let loadedConfig: AgentConfig | null = null;
try {
  loadedConfig = ConfigLoader.load({
    ...(options.provider && { provider: options.provider }),
    ...(options.model && { model: options.model }),
    ...(options.apiKey && { apiKey: options.apiKey }),
    ...(options.baseUrl && { baseUrl: options.baseUrl }),
    ...(options.maxTurns && { maxTurns: options.maxTurns }),
  });
} catch (error) {
  // Config incomplete or invalid
}

export const initialConfig = loadedConfig;
