import type { ChatProvider, ProviderName } from '@ihn-agent/types';

import { AnthropicProvider, type AnthropicProviderOptions } from './anthropic.js';
import { GeminiProvider, type GeminiProviderOptions } from './gemini.js';
import { OpenAIProvider, type OpenAIProviderOptions } from './openai.js';

export * from './anthropic.js';
export * from './gemini.js';
export * from './openai.js';

export interface CreateProviderOptions {
  name: ProviderName;
  apiKey: string;
  model?: string;
}

export function createProvider(options: CreateProviderOptions): ChatProvider {
  const { name, apiKey, model } = options;
  switch (name) {
    case 'anthropic': {
      const providerOptions: AnthropicProviderOptions = { apiKey };
      if (model) providerOptions.model = model;
      return new AnthropicProvider(providerOptions);
    }
    case 'openai': {
      const providerOptions: OpenAIProviderOptions = { apiKey };
      if (model) providerOptions.model = model;
      return new OpenAIProvider(providerOptions);
    }
    case 'gemini': {
      const providerOptions: GeminiProviderOptions = { apiKey };
      if (model) providerOptions.model = model;
      return new GeminiProvider(providerOptions);
    }
    default:
      throw new Error(`Unsupported provider: ${name}`);
  }
}
