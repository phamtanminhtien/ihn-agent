import { Box, Text } from 'ink';

import { Markdown } from '../ui/markdown';
import { ConfirmationBlock, ThinkingBlock, ToolCallBlock, ToolResultBlock } from './blocks';
import type { CLIMessage } from './types';

interface MessageListProps {
  messages: CLIMessage[];
  currentAgentText: string;
  loading: boolean;
  spinner: string[];
  spinnerIndex: number;
  activeTool: string | null;
  elapsedTime: number;
}

export const MessageList = ({
  messages,
  currentAgentText,
  loading,
  spinner,
  spinnerIndex,
  activeTool,
  elapsedTime,
}: MessageListProps) => {
  return (
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
  );
};
