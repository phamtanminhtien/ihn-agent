import type { AgentConfig } from '@ihn-agent/types';
import { z } from 'zod';

export const ProviderNameSchema = z.enum(['anthropic', 'openai', 'gemini']) satisfies z.ZodType<
  AgentConfig['provider']
>;
export const UIThemeSchema = z.enum(['dark', 'light']) satisfies z.ZodType<AgentConfig['theme']>;

export const McpServerConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

export const AgentConfigSchema = z.object({
  provider: ProviderNameSchema.default('anthropic'),
  model: z.string().min(1),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  maxContextTokens: z.number().int().positive().default(100_000),
  maxTurns: z.number().int().positive().default(50),
  autoApprove: z.boolean().default(false),
  allowedCommands: z.array(z.string()).default([]),
  streamOutput: z.boolean().default(true),
  theme: UIThemeSchema.default('dark'),
  mcpServers: z.array(McpServerConfigSchema).optional(),
}) satisfies z.ZodType<AgentConfig, any, any>;

export type ValidatedAgentConfig = z.infer<typeof AgentConfigSchema>;
