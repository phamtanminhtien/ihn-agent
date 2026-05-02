import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

import { useSuggestions } from '../../hooks/use-suggestions';
import { fileTreeCache } from '../../services/suggestion-service';
import { SuggestionList } from './suggestion-list';

interface ChatInputProps {
  onSend: (value: string) => void;
  onCommand: (value: string) => void;
  disabled: boolean;
  pendingConfirmation: boolean;
}

export const ChatInput = ({ onSend, onCommand, disabled, pendingConfirmation }: ChatInputProps) => {
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { suggestions, suggestionIndex, setSuggestionIndex } = useSuggestions(searchQuery);

  useInput((inputChar, key) => {
    if (disabled || pendingConfirmation) return;

    if (key.return) {
      if (input.trim()) {
        if (input.trim().startsWith('/')) {
          onCommand(input.trim());
        } else {
          onSend(input.trim());
        }
        setInput('');
        setSearchQuery('');
      }
    } else if (key.tab) {
      if (suggestions.length > 0) {
        const nextIndex = suggestionIndex === -1 ? 0 : suggestionIndex;
        const s = suggestions[nextIndex];
        if (s) {
          if (s.type === 'file' || s.type === 'directory') {
            fileTreeCache.recordMention(s.value);
          }

          const newValue =
            s.type === 'command'
              ? s.value
              : input.slice(0, input.match(/@([^\s]*)$/)?.index ?? 0) + '@' + s.value;

          setInput(newValue);
          setSearchQuery(newValue);
          setSuggestionIndex(-1);
        }
      }
    } else if (key.downArrow) {
      if (suggestions.length > 0) {
        const nextIndex = (suggestionIndex + 1) % suggestions.length;
        setSuggestionIndex(nextIndex);

        const s = suggestions[nextIndex];
        if (s) {
          if (s.type === 'command') {
            setInput(s.value);
          } else {
            setInput((prev) => {
              const mentionMatch = prev.match(/@([^\s]*)$/);
              if (mentionMatch) {
                return prev.slice(0, mentionMatch.index) + '@' + s.value;
              }
              return prev;
            });
          }
        }
      }
    } else if (key.upArrow) {
      if (suggestions.length > 0) {
        const nextIndex = suggestionIndex <= 0 ? suggestions.length - 1 : suggestionIndex - 1;
        setSuggestionIndex(nextIndex);

        const s = suggestions[nextIndex];
        if (s) {
          if (s.type === 'command') {
            setInput(s.value);
          } else {
            setInput((prev) => {
              const mentionMatch = prev.match(/@([^\s]*)$/);
              if (mentionMatch) {
                return prev.slice(0, mentionMatch.index) + '@' + s.value;
              }
              return prev;
            });
          }
        }
      }
    } else if (key.backspace || (key.delete && !key.ctrl && !key.meta)) {
      setInput((prev) => {
        const next = prev.slice(0, -1);
        setSearchQuery(next);
        return next;
      });
      setSuggestionIndex(-1);
    } else if (!key.ctrl && !key.meta) {
      setInput((prev) => {
        const next = prev + inputChar;
        setSearchQuery(next);
        return next;
      });
      setSuggestionIndex(-1);
    }
  });

  return (
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

      <SuggestionList suggestions={suggestions} suggestionIndex={suggestionIndex} />
    </Box>
  );
};
