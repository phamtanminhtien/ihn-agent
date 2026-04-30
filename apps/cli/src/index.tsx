import { Agent, ConfigLoader } from '@ihn-agent/core';
import { createProvider } from '@ihn-agent/providers';
import { builtInTools } from '@ihn-agent/tools';
import type { AgentEvent } from '@ihn-agent/types';
import { Command } from 'commander';
import { Box, render, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';

// CLI Argument Parsing
const program = new Command();
program
  .name('ihn')
  .description('IHN Agent CLI')
  .option('-p, --provider <name>', 'LLM provider (anthropic, openai, gemini)')
  .option('-m, --model <name>', 'Model name')
  .option('-k, --api-key <key>', 'API key')
  .option('-t, --max-turns <n>', 'Maximum turns', (v) => parseInt(v, 10))
  .argument('[prompt]', 'Initial prompt')
  .parse(process.argv);

const options = program.opts();
const initialPrompt = program.args[0];

// Load Config
let config: any;
try {
  config = ConfigLoader.load({
    ...(options.provider && { provider: options.provider }),
    ...(options.model && { model: options.model }),
    ...(options.apiKey && { apiKey: options.apiKey }),
    ...(options.maxTurns && { maxTurns: options.maxTurns }),
  });
} catch (error) {
  console.error('Configuration error:', error instanceof Error ? error.message : error);
  process.exit(1);
}

// Components
const ThinkingBlock = ({ content }: { content: string }) => (
  <Box paddingLeft={2} marginBottom={1} flexDirection="column">
    <Text color="gray" italic>
      💭 Thinking...
    </Text>
    <Text color="gray" dimColor>
      {content}
    </Text>
  </Box>
);

const ToolCallBlock = ({ name, input }: { name: string; input: any }) => (
  <Box
    paddingLeft={2}
    marginBottom={1}
    flexDirection="column"
    borderStyle="single"
    borderColor="yellow"
  >
    <Text color="yellow" bold>
      🛠 Tool Call: {name}
    </Text>
    <Box paddingLeft={1}>
      <Text color="gray">{JSON.stringify(input, null, 2)}</Text>
    </Box>
  </Box>
);

const ToolResultBlock = ({
  name,
  output,
  isError = false,
}: {
  name: string;
  output: any;
  isError?: boolean | undefined;
}) => (
  <Box paddingLeft={2} marginBottom={1} flexDirection="column">
    <Text color={isError ? 'red' : 'green'} bold>
      {isError ? '❌ Error' : '✅ Result'} from {name}
    </Text>
    <Box paddingLeft={1}>
      <Text color="gray">
        {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
      </Text>
    </Box>
  </Box>
);

interface Message {
  role: string;
  text: string;
  type?: 'thinking' | 'tool_use' | 'tool_result' | 'text';
  name?: string;
  input?: any;
  output?: any;
  isError?: boolean;
}

const App = ({ agent, initialPrompt }: { agent: Agent; initialPrompt?: string | undefined }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentAgentText, setCurrentAgentText] = useState('');

  useInput((inputChar, key) => {
    if (key.return) {
      if (input.trim() && !loading) {
        handleSend(input.trim());
      }
    } else if (key.backspace || (key.delete && !key.ctrl && !key.meta)) {
      setInput((prev) => prev.slice(0, -1));
    } else if (!key.ctrl && !key.meta) {
      setInput((prev) => prev + inputChar);
    }
  });

  const handleSend = async (userMsg: string) => {
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg, type: 'text' }]);
    setLoading(true);
    setCurrentAgentText('');

    try {
      let accumulatedText = '';
      for await (const chunk of agent.run(userMsg)) {
        if (chunk.type === 'text') {
          accumulatedText += chunk.content;
          setCurrentAgentText(accumulatedText);
        } else if (chunk.type === 'thinking') {
          // If we have accumulated text, commit it
          if (accumulatedText) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', text: accumulatedText, type: 'text' },
            ]);
            accumulatedText = '';
            setCurrentAgentText('');
          }
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', type: 'thinking', text: chunk.content },
          ]);
        } else if (chunk.type === 'tool_use') {
          if (accumulatedText) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', text: accumulatedText, type: 'text' },
            ]);
            accumulatedText = '';
            setCurrentAgentText('');
          }
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              type: 'tool_use',
              name: chunk.call.name,
              input: chunk.call.input,
              text: '',
            },
          ]);
        }
      }

      if (accumulatedText) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: accumulatedText, type: 'text' },
        ]);
        setCurrentAgentText('');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to get response';
      setMessages((prev) => [...prev, { role: 'error', text: errorMsg, type: 'text' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onEvent = (event: AgentEvent) => {
      if (event.type === 'tool_result') {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            type: 'tool_result',
            name: event.name,
            output: event.output,
            isError: event.isError,
            text: '',
          },
        ]);
      } else if (event.type === 'error') {
        setMessages((prev) => [...prev, { role: 'error', text: event.message, type: 'text' }]);
      }
    };
    agent.on('event', onEvent);
    return () => {
      agent.off('event', onEvent);
    };
  }, [agent]);

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
    }
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} borderStyle="double" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          IHN Agent CLI | {config.provider} | {config.model}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, index) => {
          if (msg.type === 'thinking') return <ThinkingBlock key={index} content={msg.text} />;
          if (msg.type === 'tool_use')
            return <ToolCallBlock key={index} name={msg.name!} input={msg.input} />;
          if (msg.type === 'tool_result')
            return (
              <ToolResultBlock
                key={index}
                name={msg.name!}
                output={msg.output}
                isError={msg.isError}
              />
            );

          return (
            <Box key={index} marginBottom={1} flexDirection="column">
              <Text
                bold
                color={msg.role === 'user' ? 'green' : msg.role === 'error' ? 'red' : 'blue'}
              >
                {msg.role === 'user' ? 'You' : msg.role === 'error' ? 'Error' : 'Agent'}
              </Text>
              <Box paddingLeft={1}>
                <Text>{msg.text}</Text>
              </Box>
            </Box>
          );
        })}
        {currentAgentText && (
          <Box flexDirection="column">
            <Text bold color="blue">
              Agent
            </Text>
            <Box paddingLeft={1}>
              <Text>{currentAgentText}</Text>
            </Box>
          </Box>
        )}
        {loading && !currentAgentText && (
          <Box paddingLeft={1}>
            <Text italic color="gray">
              Agent is working...
            </Text>
          </Box>
        )}
      </Box>

      <Box borderStyle="round" paddingX={1} borderColor="yellow">
        <Text color="yellow" bold>
          {'> '}
        </Text>
        <Text>{input}</Text>
        <Text color="yellow">█</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor italic>
          Press Enter to send, Ctrl+C to exit.
        </Text>
      </Box>
    </Box>
  );
};

// Initialize Agent
try {
  const provider = createProvider({
    name: config.provider,
    apiKey: config.apiKey,
    model: config.model,
  });

  const agent = new Agent({
    provider,
    maxTurns: config.maxTurns,
  });

  // Register built-in tools
  for (const tool of builtInTools) {
    agent.registerTool(tool);
  }

  render(<App agent={agent} initialPrompt={initialPrompt} />);
} catch (error) {
  console.error('Failed to initialize IHN Agent:', error instanceof Error ? error.message : error);
  process.exit(1);
}
