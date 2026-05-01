import { Agent } from '@ihn-agent/core';
import type { AgentConfig, AgentEvent, RiskLevel } from '@ihn-agent/types';
import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';

import { Markdown } from '../ui/markdown.js';
import { ConfirmationBlock, ThinkingBlock, ToolCallBlock, ToolResultBlock } from './blocks.js';

export type CLIMessage = { type: 'user'; content: string } | AgentEvent;

interface ChatInterfaceProps {
  agent: Agent;
  config: AgentConfig;
  initialPrompt?: string | undefined;
}

export const ChatInterface = ({ agent, config, initialPrompt }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<CLIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentAgentText, setCurrentAgentText] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    toolCallId: string;
    name: string;
    description: string;
    input: unknown;
    riskLevel: RiskLevel;
  } | null>(null);

  useInput((inputChar, key) => {
    if (pendingConfirmation) {
      if (inputChar.toLowerCase() === 'y') {
        const toolCallId = pendingConfirmation.toolCallId;
        setPendingConfirmation(null);
        handleSend(undefined, new Set([toolCallId]));
      } else if (inputChar.toLowerCase() === 'n') {
        setPendingConfirmation(null);
        setMessages((prev) => [
          ...prev,
          {
            type: 'error',
            message: `Execution of ${pendingConfirmation.name} was denied by user.`,
          },
        ]);
      }
      return;
    }

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

  const handleSend = async (userMsg?: string, approvedIds?: Set<string>) => {
    if (userMsg) {
      setInput('');
      setMessages((prev) => [...prev, { type: 'user', content: userMsg }]);
    }
    setLoading(true);
    setCurrentAgentText('');

    try {
      let accumulatedText = '';
      for await (const chunk of agent.run(userMsg, { approvedToolCallIds: approvedIds })) {
        if (chunk.type === 'text') {
          accumulatedText += chunk.content;
          setCurrentAgentText(accumulatedText);
        } else if (chunk.type === 'thinking') {
          if (accumulatedText) {
            setMessages((prev) => [...prev, { type: 'text_delta', content: accumulatedText }]);
            accumulatedText = '';
            setCurrentAgentText('');
          }
          setMessages((prev) => [...prev, { type: 'thinking', content: chunk.content }]);
        } else if (chunk.type === 'tool_use') {
          if (accumulatedText) {
            setMessages((prev) => [...prev, { type: 'text_delta', content: accumulatedText }]);
            accumulatedText = '';
            setCurrentAgentText('');
          }
          setMessages((prev) => [
            ...prev,
            {
              type: 'tool_start',
              name: chunk.call.name,
              input: chunk.call.input,
            },
          ]);
        }
      }

      if (accumulatedText) {
        setMessages((prev) => [...prev, { type: 'text_delta', content: accumulatedText }]);
        setCurrentAgentText('');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setMessages((prev) => [...prev, { type: 'error', message: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onEvent = (event: AgentEvent) => {
      if (event.type === 'tool_result') {
        setMessages((prev) => [...prev, event]);
      } else if (event.type === 'tool_confirmation') {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => m.type === 'tool_confirmation' && m.toolCallId === event.toolCallId
          );
          if (exists) return prev;
          return [...prev, event];
        });
        setPendingConfirmation({
          toolCallId: event.toolCallId,
          name: event.name,
          description: event.description,
          input: event.input,
          riskLevel: event.riskLevel,
        });
      } else if (event.type === 'error') {
        setMessages((prev) => [...prev, event]);
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
          switch (msg.type) {
            case 'user':
              return (
                <Box key={index} marginBottom={1} flexDirection="column">
                  <Text bold color="green">
                    You
                  </Text>
                  <Box paddingLeft={1}>
                    <Markdown>{msg.content}</Markdown>
                  </Box>
                </Box>
              );
            case 'text_delta':
              return (
                <Box key={index} marginBottom={1} flexDirection="column">
                  <Text bold color="blue">
                    Agent
                  </Text>
                  <Box paddingLeft={1}>
                    <Markdown>{msg.content}</Markdown>
                  </Box>
                </Box>
              );
            case 'thinking':
              return <ThinkingBlock key={index} content={msg.content} />;
            case 'tool_start':
              return <ToolCallBlock key={index} name={msg.name} input={msg.input} />;
            case 'tool_result':
              return (
                <ToolResultBlock
                  key={index}
                  name={msg.name}
                  output={msg.output}
                  isError={msg.isError}
                />
              );
            case 'tool_confirmation':
              return (
                <ConfirmationBlock
                  key={index}
                  name={msg.name}
                  description={msg.description}
                  input={msg.input}
                  riskLevel={msg.riskLevel}
                />
              );
            case 'error':
              return (
                <Box key={index} marginBottom={1} flexDirection="column">
                  <Text bold color="red">
                    Error
                  </Text>
                  <Box paddingLeft={1}>
                    <Text>{msg.message}</Text>
                  </Box>
                </Box>
              );
            default:
              return null;
          }
        })}
        {currentAgentText && (
          <Box flexDirection="column">
            <Text bold color="blue">
              Agent
            </Text>
            <Box paddingLeft={1}>
              <Markdown>{currentAgentText}</Markdown>
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

      {!pendingConfirmation ? (
        <Box borderStyle="round" paddingX={1} borderColor="yellow">
          <Text color="yellow" bold>
            {'> '}
          </Text>
          <Text>{input}</Text>
          <Text color="yellow">█</Text>
        </Box>
      ) : (
        <Box borderStyle="round" paddingX={1} borderColor="magenta">
          <Text color="magenta" bold>
            ?{' '}
          </Text>
          <Text italic>Waiting for approval... (y/n)</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor italic>
          Press Enter to send, Ctrl+C to exit.
        </Text>
      </Box>
    </Box>
  );
};
