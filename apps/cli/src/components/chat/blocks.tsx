import { Box, Text } from 'ink';

import { Markdown } from '../ui/markdown';

export const ThinkingBlock = ({ content }: { content: string }) => (
  <Box paddingLeft={2} marginBottom={1} flexDirection="column">
    <Text color="gray" italic>
      💭 Thinking...
    </Text>
    <Box paddingLeft={1}>
      <Markdown>{content}</Markdown>
    </Box>
  </Box>
);

export const ToolCallBlock = ({ name, input }: { name: string; input: unknown }) => (
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
      <Markdown>{`\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\``}</Markdown>
    </Box>
  </Box>
);

export const ToolResultBlock = ({
  name,
  output,
  isError = false,
}: {
  name: string;
  output: unknown;
  isError?: boolean | undefined;
}) => {
  const displayOutput =
    typeof output === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(output);
            return JSON.stringify(parsed, null, 2);
          } catch {
            return output;
          }
        })()
      : JSON.stringify(output, null, 2);

  // Wrap in a markdown code block to preserve formatting
  const markdownContent = `\`\`\`json\n${displayOutput}\n\`\`\``;

  return (
    <Box paddingLeft={2} marginBottom={1} flexDirection="column">
      <Text color={isError ? 'red' : 'green'} bold>
        {isError ? '❌ Error' : '✅ Result'} from {name}
      </Text>
      <Box paddingLeft={1}>
        <Markdown>{markdownContent}</Markdown>
      </Box>
    </Box>
  );
};

export const ConfirmationBlock = ({
  name,
  description,
  input,
  riskLevel,
}: {
  name: string;
  description: string;
  input: unknown;
  riskLevel: string;
}) => {
  const riskColor = riskLevel === 'high' ? 'red' : riskLevel === 'medium' ? 'yellow' : 'blue';

  return (
    <Box
      paddingLeft={2}
      marginBottom={1}
      flexDirection="column"
      borderStyle="double"
      borderColor="magenta"
    >
      <Box flexDirection="row" marginBottom={1}>
        <Text color="magenta" bold>
          ⚠️ Confirmation Required: {name}
        </Text>
        <Box marginLeft={2}>
          <Text color={riskColor} bold>
            [{riskLevel.toUpperCase()} RISK]
          </Text>
        </Box>
      </Box>

      {description && (
        <Box marginBottom={1}>
          <Text italic color="gray">
            {description}
          </Text>
        </Box>
      )}

      <Box paddingLeft={1} marginBottom={1}>
        <Markdown>{`\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\``}</Markdown>
      </Box>

      <Box>
        <Text>Allow this tool to run? </Text>
        <Text bold color="green">
          [y]
        </Text>
        <Text>es / </Text>
        <Text bold color="red">
          [n]
        </Text>
        <Text>o</Text>
      </Box>
    </Box>
  );
};
