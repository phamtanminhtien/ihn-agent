import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { AgentConfig } from '@ihn-agent/types';

import { AgentConfigSchema } from './config.schema';

/**
 * Loads and validates agent configuration from multiple sources.
 * Precedence: Overrides > Environment Variables > Config File
 */
export class ConfigLoader {
  static load(overrides: Record<string, unknown> = {}) {
    const fileConfig = this.readJsonFile();
    const envConfig = this.readEnv();

    // Merge sources
    const rawConfig = {
      ...fileConfig,
      ...envConfig,
      ...overrides,
    };

    // Validate using Zod schema from @ihn-agent/types
    // This will also apply default values defined in the schema
    return AgentConfigSchema.parse(rawConfig);
  }

  private static readJsonFile(): Record<string, unknown> {
    const homeConfigPath = path.join(os.homedir(), '.ihn', 'config.json');
    const localConfigPath = path.join(process.cwd(), '.ihn', 'config.json');

    const configPath = fs.existsSync(localConfigPath) ? localConfigPath : homeConfigPath;

    if (!fs.existsSync(configPath)) return {};

    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.warn(`Failed to parse config file at ${configPath}:`, error);
      return {};
    }
  }

  private static readEnv(): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    if (process.env.IHN_PROVIDER) config.provider = process.env.IHN_PROVIDER;
    if (process.env.IHN_MODEL) config.model = process.env.IHN_MODEL;

    // API Key can come from provider-specific env vars
    const apiKey =
      process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) config.apiKey = apiKey;
    if (process.env.IHN_BASE_URL) config.baseUrl = process.env.IHN_BASE_URL;

    if (process.env.IHN_MAX_TURNS) config.maxTurns = parseInt(process.env.IHN_MAX_TURNS, 10);
    if (process.env.IHN_AUTO_APPROVE) config.autoApprove = process.env.IHN_AUTO_APPROVE === 'true';

    return config;
  }

  static save(config: AgentConfig): void {
    const homeConfigDir = path.join(os.homedir(), '.ihn');
    const homeConfigPath = path.join(homeConfigDir, 'config.json');
    const localConfigPath = path.join(process.cwd(), '.ihn', 'config.json');

    const configPath = fs.existsSync(localConfigPath) ? localConfigPath : homeConfigPath;
    const configDir = path.dirname(configPath);

    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(`Failed to save config file at ${configPath}:`, error);
    }
  }
}
