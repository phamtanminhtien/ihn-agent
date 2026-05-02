import { Agent } from '@ihn-agent/core';
import type { AgentConfig, AgentEvent, RiskLevel } from '@ihn-agent/types';
import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';

import { SLASH_COMMANDS, type SlashCommand } from '../../cli/commands';
import { ChatInput } from './chat-input';
import { Header } from './header';
import { MessageList } from './message-list';
import type { CLIMessage } from './types';

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
  const [loading, setLoading] = useState(false);
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

  useInput((inputChar) => {
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
    }
  });

  const handleCommand = async (cmd: string) => {
    const [commandName, ...args] = cmd.slice(1).split(' ');
    if (!commandName) return;

    const match = SLASH_COMMANDS.find(
      (c: SlashCommand) => c.name.slice(1).toLowerCase() === commandName.toLowerCase()
    );

    if (match) {
      await match.handler(
        {
          agent,
          setMessages,
          messages,
          config,
          onConfigChange,
          exit: () => process.exit(0),
          setCurrentAgentText,
          setLoading,
          commands: SLASH_COMMANDS,
        },
        args
      );
    } else {
      setMessages((prev) => [
        ...prev,
        {
          type: 'error',
          message: `Unknown command: /${commandName}. Type /help for available commands.`,
        },
      ]);
    }
  };

  const handleSend = async (userMsg?: string, approvedIds?: Set<string>) => {
    if (userMsg) {
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
      <Header config={config} />

      <MessageList
        messages={messages}
        currentAgentText={currentAgentText}
        loading={loading}
        spinner={spinner}
        spinnerIndex={spinnerIndex}
        activeTool={activeTool}
        elapsedTime={elapsedTime}
      />

      <ChatInput
        onSend={handleSend}
        onCommand={handleCommand}
        disabled={loading}
        pendingConfirmation={!!pendingConfirmation}
      />

      <Box marginTop={1} paddingX={1}>
        <Text dimColor italic>
          Press Enter to send, Ctrl+C to exit.
        </Text>
      </Box>
    </Box>
  );
};
