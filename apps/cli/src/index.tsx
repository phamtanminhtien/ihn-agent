import { Agent } from '@ihn-agent/core';
import type { ChatProvider, ProviderStream, StreamChunk } from '@ihn-agent/types';
import { Box, render, Text, useInput } from 'ink';
import React, { useState } from 'react';

// Mock Provider
const mockProvider: ChatProvider = {
  streamChat: async () => {
    const chunks: StreamChunk[] = [{ type: 'text', content: 'Hello! I am a mock agent.' }];
    const stream: ProviderStream = {
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) yield chunk;
      },
    };
    return stream;
  },
};

const agent = new Agent({ provider: mockProvider });

const App = () => {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useInput((inputChar, key) => {
    if (key.return) {
      if (input.trim() && !loading) {
        handleSend();
      }
    } else if (key.backspace || (key.delete && !key.ctrl && !key.meta)) {
      setInput((prev) => prev.slice(0, -1));
    } else {
      setInput((prev) => prev + inputChar);
    }
  });

  const handleSend = async () => {
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      let fullResponse = '';
      for await (const chunk of agent.run(userMsg)) {
        if (chunk.type === 'text') {
          fullResponse += chunk.content;
        }
      }
      setMessages((prev) => [...prev, { role: 'agent', text: fullResponse }]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to get response';
      setMessages((prev) => [...prev, { role: 'error', text: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          IHN Agent CLI
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, index) => (
          <Box key={index}>
            <Text color={msg.role === 'user' ? 'green' : msg.role === 'error' ? 'red' : 'blue'}>
              {msg.role === 'user' ? 'You: ' : msg.role === 'error' ? 'Error: ' : 'Agent: '}
            </Text>
            <Text>{msg.text}</Text>
          </Box>
        ))}
        {loading && (
          <Box>
            <Text italic color="gray">
              Agent is thinking...
            </Text>
          </Box>
        )}
      </Box>

      <Box borderStyle="round" paddingX={1}>
        <Text color="yellow">{'> '}</Text>
        <Text>{input}</Text>
        <Text color="yellow">█</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press Enter to send, Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
};

render(<App />);
