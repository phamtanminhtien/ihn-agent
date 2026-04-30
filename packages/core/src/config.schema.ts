import type { AgentConfig } from '@ihn-agent/types';
import { z } from 'zod';

export const ProviderNameSchema = z.enum(['anthropic', 'openai', 'gemini']) satisfies z.ZodType<
  AgentConfig['provider']
>;
export const UIThemeSchema = z.enum(['dark', 'light']) satisfies z.ZodType<AgentConfig['theme']>;

export const AgentConfigSchema = z.object({
  provider: ProviderNameSchema.default('anthropic'),
  model: z.string().min(1),
  apiKey: z.string().min(1),
  maxContextTokens: z.number().int().positive().default(100_000),
  maxTurns: z.number().int().positive().default(50),
  autoApprove: z.boolean().default(false),
  allowedCommands: z.array(z.string()).default([]),
  streamOutput: z.boolean().default(true),
  theme: UIThemeSchema.default('dark'),
}) satisfies z.ZodType<AgentConfig, any, any>;

export type ValidatedAgentConfig = z.infer<typeof AgentConfigSchema>;
