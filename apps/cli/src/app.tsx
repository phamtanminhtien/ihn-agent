import { Agent, ConfigLoader } from '@ihn-agent/core';
import {
  ContextManager,
  PromptComposer,
  PromptRegistry,
  registerDefaultBlocks,
} from '@ihn-agent/prompt';
import { createProvider } from '@ihn-agent/providers';
import { builtInTools } from '@ihn-agent/tools';
import type { AgentConfig, EnvironmentSnapshot } from '@ihn-agent/types';
import { Box, Text } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';

import { ChatInterface } from './components/chat/chat-interface';
import { Onboarding } from './components/onboarding/onboarding';

interface AppProps {
  initialConfig: AgentConfig | null;
  initialPrompt?: string | undefined;
  forceOnboarding?: boolean;
}

export const App = ({ initialConfig, initialPrompt, forceOnboarding }: AppProps) => {
  const [config, setConfig] = useState<AgentConfig | null>(forceOnboarding ? null : initialConfig);
  const [envContext, setEnvContext] = useState<EnvironmentSnapshot | null>(null);

  useEffect(() => {
    const manager = new ContextManager();
    manager.getSnapshot().then(setEnvContext);
  }, []);

  useEffect(() => {
    if (config) {
      ConfigLoader.save(config);
    }
  }, [config]);

  const agent = useMemo(() => {
    if (!config || !envContext) return null;
    try {
      const provider = createProvider({
        name: config.provider,
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
      });

      const registry = new PromptRegistry();
      registerDefaultBlocks(registry);
      const composer = new PromptComposer(registry);
      composer
        .addBlock('persona/base')
        .addBlock('rules/tool-usage')
        .addBlock('rules/security')
        .addBlock('rules/code-quality');

      const a = new Agent({
        provider,
        maxTurns: config.maxTurns,
        systemPrompt: composer,
        promptVariables: {
          ...envContext,
        },
      });

      for (const tool of builtInTools) {
        a.registerTool(tool);
      }
      return a;
    } catch (e) {
      console.error('Failed to create agent:', e);
      return null;
    }
  }, [config?.provider, config?.apiKey, config?.baseUrl, envContext]);

  useEffect(() => {
    if (agent && config?.model) {
      agent.setModel(config.model);
    }
  }, [agent, config?.model]);

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

  return (
    <ChatInterface
      agent={agent}
      config={config}
      initialPrompt={initialPrompt}
      onConfigChange={setConfig}
    />
  );
};
