import * as fs from 'fs';
import * as path from 'path';
import { useMemo, useState } from 'react';

import { SLASH_COMMANDS, type SlashCommand } from '../cli/commands';

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
        const cwd = process.cwd();
        let searchDir = cwd;
        let fileQuery = query;

        if (query.includes('/')) {
          const lastSlash = query.lastIndexOf('/');
          const dirPart = query.slice(0, lastSlash);
          fileQuery = query.slice(lastSlash + 1);
          searchDir = path.resolve(cwd, dirPart);
        }

        if (fs.existsSync(searchDir) && fs.statSync(searchDir).isDirectory()) {
          const files = fs.readdirSync(searchDir, { withFileTypes: true });
          return files
            .filter((f) => f.name.toLowerCase().startsWith(fileQuery.toLowerCase()))
            .filter((f) => !f.name.startsWith('.')) // Hide hidden files
            .map((f) => {
              const dirPart = query.includes('/') ? query.slice(0, query.lastIndexOf('/') + 1) : '';
              const value = dirPart + f.name + (f.isDirectory() ? '/' : '');
              return {
                name: f.name,
                description: f.isDirectory() ? 'Directory' : 'File',
                value: value,
                type: (f.isDirectory() ? 'directory' : 'file') as 'directory' | 'file',
              };
            })
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'directory' ? -1 : 1;
            })
            .slice(0, 10);
        }
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
