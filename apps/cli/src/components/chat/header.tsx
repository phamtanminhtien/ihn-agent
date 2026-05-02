import type { AgentConfig } from '@ihn-agent/types';
import { Box, Text } from 'ink';

interface HeaderProps {
  config: AgentConfig;
}

export const Header = ({ config }: HeaderProps) => {
  return (
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
  );
};
