import { Box, Text } from 'ink';

import type { Suggestion } from '../../hooks/use-suggestions';

const MAX_VISIBLE_SUGGESTIONS = 5;

interface SuggestionListProps {
  suggestions: Suggestion[];
  suggestionIndex: number;
}

export const SuggestionList = ({ suggestions, suggestionIndex }: SuggestionListProps) => {
  if (suggestions.length === 0) return null;

  const half = Math.floor(MAX_VISIBLE_SUGGESTIONS / 2);
  const start = Math.max(
    0,
    Math.min(suggestionIndex - half, Math.max(0, suggestions.length - MAX_VISIBLE_SUGGESTIONS))
  );
  const visible = suggestions.slice(start, start + MAX_VISIBLE_SUGGESTIONS);

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={0}>
      {visible.map((s, idx) => {
        const isSelected =
          suggestions.indexOf(s) === suggestionIndex ||
          (suggestionIndex === -1 && suggestions.length === 1 && suggestions.indexOf(s) === 0);

        const icon = s.type === 'command' ? '→' : s.type === 'directory' ? '📁' : '📄';

        return (
          <Box key={s.value + idx} flexDirection="row">
            <Text color={isSelected ? 'cyan' : 'gray'} bold={isSelected}>
              {isSelected ? '→ ' : '  '}
              {icon} {s.name.padEnd(20)}
            </Text>
            <Text color="dimColor"> - {s.description}</Text>
          </Box>
        );
      })}
    </Box>
  );
};
