import { Agent } from '@ihn-agent/core';
import type { AgentConfig, AgentEvent, RiskLevel } from '@ihn-agent/types';
import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';

import { SLASH_COMMANDS } from '../../cli/commands';
import { Markdown } from '../ui/markdown';
import { ConfirmationBlock, ThinkingBlock, ToolCallBlock, ToolResultBlock } from './blocks';

export type CLIMessage =
  | { type: 'user'; content: string }
  | { type: 'info'; content: string }
  | AgentEvent;

interface ChatInterfaceProps {
  agent: Agent;
  config: AgentConfig;
  initialPrompt?: string | undefined;
  onConfigChange?: (config: AgentConfig) => void;
}

export const ChatInterface = ({
  agent,
  config,
  initialPrompt,
  onConfigChange,
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<CLIMessage[]>([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [currentAgentText, setCurrentAgentText] = useState('');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    toolCallId: string;
    name: string;
    description: string;
    input: unknown;
    riskLevel: RiskLevel;
  } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [spinnerIndex, setSpinnerIndex] = useState(0);

  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let spinnerTimer: NodeJS.Timeout;

    if (loading) {
      const start = Date.now();
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
      }, 1000);

      spinnerTimer = setInterval(() => {
        setSpinnerIndex((prev) => (prev + 1) % spinner.length);
      }, 80);
    } else {
      setElapsedTime(0);
      setActiveTool(null);
    }

    return () => {
      clearInterval(timer);
      clearInterval(spinnerTimer);
    };
  }, [loading]);

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
        if (input.trim().startsWith('/')) {
          handleCommand(input.trim());
        } else {
          handleSend(input.trim());
        }
      }
    } else if (key.tab || key.downArrow) {
      if (input.startsWith('/')) {
        const suggestions = SLASH_COMMANDS.filter((c) =>
          c.name.startsWith(searchQuery.toLowerCase())
        );
        if (suggestions.length > 0) {
          const nextIndex = (suggestionIndex + 1) % suggestions.length;
          const suggestion = suggestions[nextIndex];
          if (suggestion) {
            setSuggestionIndex(nextIndex);
            setInput(suggestion.name);
          }
        }
      }
    } else if (key.upArrow) {
      if (input.startsWith('/')) {
        const suggestions = SLASH_COMMANDS.filter((c) =>
          c.name.startsWith(searchQuery.toLowerCase())
        );
        if (suggestions.length > 0) {
          const nextIndex = suggestionIndex <= 0 ? suggestions.length - 1 : suggestionIndex - 1;
          const suggestion = suggestions[nextIndex];
          if (suggestion) {
            setSuggestionIndex(nextIndex);
            setInput(suggestion.name);
          }
        }
      }
    } else if (key.backspace || (key.delete && !key.ctrl && !key.meta)) {
      setInput((prev) => {
        const next = prev.slice(0, -1);
        if (!next.startsWith('/')) {
          setSuggestionIndex(-1);
          setSearchQuery('');
        } else {
          setSearchQuery(next);
          setSuggestionIndex(-1);
        }
        return next;
      });
    } else if (!key.ctrl && !key.meta) {
      setInput((prev) => {
        const next = prev + inputChar;
        if (!next.startsWith('/')) {
          setSuggestionIndex(-1);
          setSearchQuery('');
        } else {
          setSearchQuery(next);
          setSuggestionIndex(-1);
        }
        return next;
      });
    }
  });

  const handleCommand = async (cmd: string) => {
    const [command, ...args] = cmd.slice(1).split(' ');
    setInput('');
    setSearchQuery('');
    setSuggestionIndex(-1);

    if (!command) return;

    const match = SLASH_COMMANDS.find(
      (c) => c.name.slice(1).toLowerCase() === command.toLowerCase()
    );

    if (match) {
      await match.handler(
        {
          agent,
          setMessages,
          config,
          onConfigChange,
          exit: () => process.exit(0),
        },
        args
      );
    } else {
      setMessages((prev) => [
        ...prev,
        {
          type: 'error',
          message: `Unknown command: /${command}. Type /help for available commands.`,
        },
      ]);
    }
  };

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
      setActiveTool(null);
    }
  };

  useEffect(() => {
    const onEvent = (event: AgentEvent) => {
      if (event.type === 'tool_result') {
        setMessages((prev) => [...prev, event]);
        setActiveTool(null);
      } else if (event.type === 'tool_start') {
        setActiveTool(event.name);
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
        setActiveTool(null);
      } else if (event.type === 'error') {
        setMessages((prev) => [...prev, event]);
        setActiveTool(null);
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
      <Box
        marginBottom={1}
        paddingX={1}
        flexDirection="row"
        alignItems="center"
        borderStyle="round"
        borderColor="cyan"
      >
        <Box marginRight={3} flexDirection="column">
          <Text color="cyan">{`    __  __ _   __`}</Text>
          <Text color="cyan">{`   / / / /| | / /`}</Text>
          <Text color="blue">{`  / /_/ / |  / / `}</Text>
          <Text color="blue">{` / __  /  | / /  `}</Text>
          <Text color="cyan">{`/_/ /_/   |_/   `}</Text>
        </Box>
        <Box flexDirection="column">
          <Box flexDirection="row">
            <Text bold color="cyan">
              IHN Agent
            </Text>
            <Text dimColor> v1.0.0</Text>
          </Box>
          <Text>
            {config.provider} · {config.model}
          </Text>
          <Text dimColor italic>
            {process.cwd()}
          </Text>
        </Box>
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
            case 'info':
              return (
                <Box key={index} marginBottom={1} flexDirection="column">
                  <Text bold color="magenta">
                    System
                  </Text>
                  <Box paddingLeft={1}>
                    <Markdown>{msg.content}</Markdown>
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
        {loading && (
          <Box paddingLeft={1} flexDirection="row">
            <Text color="yellow">{spinner[spinnerIndex]} </Text>
            <Text italic color="gray">
              {activeTool ? `Executing ${activeTool}...` : 'Agent is working...'}
            </Text>
            <Text color="cyan"> ({elapsedTime}s)</Text>
          </Box>
        )}
      </Box>

      <Box flexDirection="column">
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

        {input.startsWith('/') && (
          <Box flexDirection="column" paddingX={1} marginTop={0}>
            {SLASH_COMMANDS.filter((c) => c.name.startsWith(searchQuery.toLowerCase())).map(
              (c, i) => {
                const suggestions = SLASH_COMMANDS.filter((s) =>
                  s.name.startsWith(searchQuery.toLowerCase())
                );
                const isSelected =
                  i === suggestionIndex ||
                  (suggestionIndex === -1 && suggestions.length === 1 && i === 0);
                return (
                  <Box key={c.name} flexDirection="row">
                    <Text color={isSelected ? 'cyan' : 'gray'} bold={isSelected}>
                      {isSelected ? '→ ' : '  '}
                      {c.name.padEnd(10)}
                    </Text>
                    <Text color="dimColor"> - {c.description}</Text>
                  </Box>
                );
              }
            )}
          </Box>
        )}

        <Box marginTop={1} paddingX={1}>
          <Text dimColor italic>
            Press Enter to send, Ctrl+C to exit.
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
