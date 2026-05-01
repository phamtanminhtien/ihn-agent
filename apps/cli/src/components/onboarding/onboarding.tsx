import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { AgentConfig, ProviderName } from '@ihn-agent/types';
import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { SelectInput } from '../ui/select-input.js';
import { TextInput } from '../ui/text-input.js';

interface OnboardingProps {
  onComplete: (config: AgentConfig) => void;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState<'provider' | 'apiKey' | 'baseUrl' | 'model' | 'confirm'>(
    'provider'
  );
  const [provider, setProvider] = useState<ProviderName>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');

  const providers = [
    { label: 'Anthropic', value: 'anthropic' },
    { label: 'OpenAI', value: 'openai' },
    { label: 'Google Gemini', value: 'gemini' },
  ];

  const defaultModels: Record<string, string> = {
    anthropic: 'claude-3-5-sonnet-20241022',
    openai: 'gpt-4o',
    gemini: 'gemini-1.5-pro',
  };

  const defaultBaseUrls: Record<string, string> = {
    anthropic: 'https://api.anthropic.com',
    openai: 'https://api.openai.com/v1',
    gemini: 'https://generativelanguage.googleapis.com',
  };

  const handleProviderSelect = (val: string) => {
    setProvider(val as ProviderName);
    setModel(defaultModels[val] || '');
    setStep('apiKey');
  };

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      if (provider === 'anthropic' || provider === 'openai') {
        setStep('baseUrl');
      } else {
        setStep('model');
      }
    }
  };

  const handleBaseUrlSubmit = () => {
    setStep('model');
  };

  const handleModelSubmit = () => {
    if (model.trim()) {
      setStep('confirm');
    }
  };

  const createConfig = (): AgentConfig => ({
    provider,
    apiKey,
    model,
    baseUrl: baseUrl.trim() || undefined,
    maxTurns: 10,
    maxContextTokens: 100_000,
    autoApprove: false,
    allowedCommands: [],
    streamOutput: true,
    theme: 'dark',
  });

  const saveConfig = () => {
    const config = createConfig();

    const configDir = path.join(os.homedir(), '.ihn');
    const configPath = path.join(configDir, 'config.json');

    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      onComplete(config);
    } catch (error) {
      console.error('Failed to save config:', error);
      onComplete(config);
    }
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="magenta">
      <Box marginBottom={1}>
        <Text bold color="magenta">
          🚀 Welcome to IHN Agent Setup
        </Text>
      </Box>

      {step === 'provider' && (
        <SelectInput
          label="Select your LLM provider:"
          options={providers}
          onSelect={handleProviderSelect}
        />
      )}

      {step === 'apiKey' && (
        <TextInput
          label={`Enter your ${provider} API Key:`}
          value={apiKey}
          onChange={setApiKey}
          onSubmit={handleApiKeySubmit}
          mask={true}
        />
      )}

      {step === 'baseUrl' && (
        <TextInput
          label="Enter custom Base URL (optional, press Enter to skip):"
          placeholder={defaultBaseUrls[provider]}
          value={baseUrl}
          onChange={setBaseUrl}
          onSubmit={handleBaseUrlSubmit}
        />
      )}

      {step === 'model' && (
        <TextInput
          label="Enter model name:"
          placeholder={defaultModels[provider]}
          value={model}
          onChange={setModel}
          onSubmit={handleModelSubmit}
        />
      )}

      {step === 'confirm' && (
        <Box flexDirection="column">
          <Text>Configuration Summary:</Text>
          <Text>
            {'  '}Provider: <Text color="cyan">{provider}</Text>
          </Text>
          <Text>
            {'  '}Model: <Text color="cyan">{model}</Text>
          </Text>
          <Text>
            {'  '}API Key: <Text color="cyan">********</Text>
          </Text>
          {baseUrl && (
            <Text>
              {'  '}Base URL: <Text color="cyan">{baseUrl}</Text>
            </Text>
          )}

          <Box marginTop={1}>
            <Text>Save this configuration? (Press Enter to save and start)</Text>
          </Box>
          <SelectInput
            label=""
            options={[
              { label: 'Yes, save and continue', value: 'yes' },
              { label: 'No, just start this session', value: 'no' },
            ]}
            onSelect={(val) => {
              if (val === 'yes') {
                saveConfig();
              } else {
                onComplete(createConfig());
              }
            }}
          />
        </Box>
      )}
    </Box>
  );
};
