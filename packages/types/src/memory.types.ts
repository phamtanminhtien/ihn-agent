import type { ConversationMessage } from './message.types.js';

export interface WorkingMemory {
  /**
   * High-level steps the agent intends to take
   */
  plan: string[];
  /**
   * Files currently "in focus" or recently read/edited
   */
  openFiles: string[];
  /**
   * Key-value scratch space for tools to share data
   */
  variables: Record<string, unknown>;
  /**
   * Steps marked done (for loop-guard awareness)
   */
  completedSteps: string[];
}

export interface MemoryEntry {
  sessionId: string;
  timestamp: string;
  summary: string;
  messages: ConversationMessage[];
}

export interface MemoryStore {
  load(): Promise<MemoryEntry[]>;
  append(entry: MemoryEntry): Promise<void>;
  summarise(): Promise<string>;
  clear(): Promise<void>;
}
