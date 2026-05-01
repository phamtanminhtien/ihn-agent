import { Agent } from '@ihn-agent/core';
import { createProvider } from '@ihn-agent/providers';
import { builtInTools } from '@ihn-agent/tools';
import type { AgentConfig } from '@ihn-agent/types';
import { Box, Text } from 'ink';
import React, { useMemo, useState } from 'react';

import { ChatInterface } from './components/chat/chat-interface.js';
import { Onboarding } from './components/onboarding/onboarding.js';

interface AppProps {
  initialConfig: AgentConfig | null;
  initialPrompt?: string | undefined;
}

export const App = ({ initialConfig, initialPrompt }: AppProps) => {
  const [config, setConfig] = useState<AgentConfig | null>(initialConfig);

  const agent = useMemo(() => {
    if (!config) return null;
    try {
      const provider = createProvider({
        name: config.provider,
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
      });

      const a = new Agent({
        provider,
        maxTurns: config.maxTurns,
      });

      for (const tool of builtInTools) {
        a.registerTool(tool);
      }
      return a;
    } catch (e) {
      console.error('Failed to create agent:', e);
      return null;
    }
  }, [config]);

  if (!config) {
    return <Onboarding onComplete={setConfig} />;
  }

  if (!agent) {
    return (
      <Box padding={1}>
        <Text color="red">Failed to initialize agent. Check your configuration.</Text>
      </Box>
    );
  }

  return <ChatInterface agent={agent} config={config} initialPrompt={initialPrompt} />;
};
