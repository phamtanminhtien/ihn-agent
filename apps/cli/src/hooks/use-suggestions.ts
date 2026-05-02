import { useMemo, useState } from 'react';

import { SLASH_COMMANDS, type SlashCommand } from '../cli/commands';
import { fileTreeCache } from '../services/suggestion-service';

export interface Suggestion {
  name: string;
  description: string;
  value: string;
  type: 'command' | 'file' | 'directory';
}

export const useSuggestions = (input: string) => {
  const [suggestionIndex, setSuggestionIndex] = useState(-1);

  const suggestions = useMemo((): Suggestion[] => {
    // Slash commands
    if (input.startsWith('/')) {
      const query = input.toLowerCase();
      return SLASH_COMMANDS.filter((c: SlashCommand) => c.name.toLowerCase().startsWith(query)).map(
        (c: SlashCommand) => ({
          name: c.name,
          description: c.description,
          value: c.name,
          type: 'command',
        })
      );
    }

    // @ mention detection
    const mentionMatch = input.match(/@([^\s]*)$/);
    if (mentionMatch) {
      const query = mentionMatch[1] || '';
      try {
        const results = fileTreeCache.search(query);
        return results.map((item) => ({
          name: item.path,
          description: item.isDirectory ? 'Directory' : 'File',
          value: item.path + (item.isDirectory ? '/' : ''),
          type: item.isDirectory ? 'directory' : 'file',
        }));
      } catch (e) {
        return [];
      }
    }

    return [];
  }, [input]);

  return {
    suggestions,
    suggestionIndex,
    setSuggestionIndex,
  };
};
