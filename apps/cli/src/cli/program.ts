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
  .argument('[prompt]', 'Initial prompt')
  .parse(process.argv);

const options = program.opts();
export const initialPrompt = program.args[0];

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
