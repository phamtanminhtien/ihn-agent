import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { type FSWatcher, watch } from 'chokidar';
import fg from 'fast-glob';
import ignore from 'ignore';

export interface FileItem {
  path: string;
  name: string;
  isDirectory: boolean;
  mentionCount: number;
  lastMentionedAt: number;
}

export interface FileTreeCacheOptions {
  persist?: boolean;
  ignorePatterns?: string[];
  rootPath: string;
}

export class FileTreeCache {
  private items: Map<string, FileItem> = new Map();
  private watcher: FSWatcher | null = null;
  private rootPath: string;
  private persist: boolean;
  private ignorePatterns: string[];
  private cacheFilePath: string;
  private ig: ReturnType<typeof ignore>;

  constructor(options: FileTreeCacheOptions) {
    this.rootPath = options.rootPath;
    this.persist = options.persist ?? true;
    this.ignorePatterns = options.ignorePatterns ?? [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
    ];
    this.cacheFilePath = path.join(os.homedir(), '.ihn', 'cache', 'file-tree.json');
    this.ig = ignore().add(this.ignorePatterns);
  }

  async initialize() {
    if (this.persist) {
      this.loadFromDisk();
    }

    // Start re-indexing in background
    this.reindex();

    // Start watching
    this.startWatcher();
  }

  private async reindex() {
    try {
      const entries = await fg(['**/*'], {
        cwd: this.rootPath,
        onlyFiles: false,
        markDirectories: true,
        ignore: this.ignorePatterns,
        dot: true,
      });

      const newItems = new Map<string, FileItem>();
      for (const entry of entries) {
        const isDirectory = entry.endsWith('/');
        const cleanPath = isDirectory ? entry.slice(0, -1) : entry;
        // Preserve existing mention data
        const existing = this.items.get(cleanPath);

        newItems.set(cleanPath, {
          path: cleanPath,
          name: path.basename(cleanPath),
          isDirectory,
          mentionCount: existing?.mentionCount ?? 0,
          lastMentionedAt: existing?.lastMentionedAt ?? 0,
        });
      }

      this.items = newItems;

      if (this.persist) {
        this.saveToDisk();
      }
    } catch (error) {
      console.error('Failed to reindex file tree:', error);
    }
  }

  private startWatcher() {
    // Use a function-based ignored for chokidar v4 compatibility.
    // Using glob strings in v4 can cause it to scan node_modules before filtering,
    // causing a hang on startup.
    const ignoredFn = (filePath: string) => {
      const relative = path.relative(this.rootPath, filePath);
      // Empty string = root itself; '..' = outside root. Never ignore these.
      if (!relative || relative.startsWith('..')) return false;
      return this.ig.ignores(relative);
    };

    this.watcher = watch(this.rootPath, {
      ignored: ignoredFn,
      // persistent: false ensures the watcher does NOT keep the Node.js
      // event loop alive, so the CLI can exit normally when Ink is done.
      persistent: false,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    });

    this.watcher
      .on('add', (filePath: string) => this.updateItem(filePath, false))
      .on('addDir', (dirPath: string) => this.updateItem(dirPath, true))
      .on('unlink', (filePath: string) => this.removeItem(filePath))
      .on('unlinkDir', (dirPath: string) => this.removeItem(dirPath));
  }

  private updateItem(fullPath: string, isDirectory: boolean) {
    const relativePath = path.relative(this.rootPath, fullPath);
    if (this.ig.ignores(relativePath)) return;

    const existing = this.items.get(relativePath);

    this.items.set(relativePath, {
      path: relativePath,
      name: path.basename(relativePath),
      isDirectory,
      mentionCount: existing?.mentionCount ?? 0,
      lastMentionedAt: existing?.lastMentionedAt ?? 0,
    });

    if (this.persist) {
      this.debouncedSave();
    }
  }

  private removeItem(fullPath: string) {
    const relativePath = path.relative(this.rootPath, fullPath);
    this.items.delete(relativePath);

    if (this.persist) {
      this.debouncedSave();
    }
  }

  private saveTimer: NodeJS.Timeout | null = null;
  private debouncedSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveToDisk(), 2000);
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.cacheFilePath, 'utf8'));
        if (Array.isArray(data)) {
          this.items = new Map(data.map((item: FileItem) => [item.path, item]));
        }
      }
    } catch (error) {
      console.warn('Failed to load file tree cache from disk:', error);
    }
  }

  private saveToDisk() {
    try {
      const cacheDir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      const data = Array.from(this.items.values());
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save file tree cache to disk:', error);
    }
  }

  recordMention(filePath: string) {
    const cleanPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
    const item = this.items.get(cleanPath);
    if (item) {
      item.mentionCount = (item.mentionCount ?? 0) + 1;
      item.lastMentionedAt = Date.now();
      if (this.persist) {
        this.debouncedSave();
      }
    }
  }

  search(query: string): FileItem[] {
    const lowercaseQuery = query.toLowerCase();
    const matches: { item: FileItem; score: number }[] = [];

    if (!query) {
      // Show recently mentioned or just top items
      return Array.from(this.items.values())
        .sort((a, b) => {
          if (a.lastMentionedAt !== b.lastMentionedAt) {
            return (b.lastMentionedAt ?? 0) - (a.lastMentionedAt ?? 0);
          }
          if (a.mentionCount !== b.mentionCount) {
            return (b.mentionCount ?? 0) - (a.mentionCount ?? 0);
          }
          return a.path.length - b.path.length;
        })
        .slice(0, 20);
    }

    for (const item of this.items.values()) {
      const lowerPath = item.path.toLowerCase();
      const lowerName = item.name.toLowerCase();

      let score = 0;

      // Priority 1: Exact match on name
      if (lowerName === lowercaseQuery) {
        score = 100;
      }
      // Priority 2: Substring match on name
      else if (lowerName.includes(lowercaseQuery)) {
        score = 80 - lowerName.indexOf(lowercaseQuery);
      }
      // Priority 3: Substring match on path
      else if (lowerPath.includes(lowercaseQuery)) {
        score = 60 - lowerPath.indexOf(lowercaseQuery);
      }
      // Priority 4: Fuzzy match on path
      else if (this.fuzzyMatch(lowerPath, lowercaseQuery)) {
        score = 40;
      }

      if (score > 0) {
        // Boost score based on mention frequency/recency
        const mentionBoost = Math.min((item.mentionCount ?? 0) * 2, 20);
        matches.push({ item, score: score + mentionBoost });
      }
    }

    return matches
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        // If scores are tied, use recency
        if (a.item.lastMentionedAt !== b.item.lastMentionedAt) {
          return (b.item.lastMentionedAt ?? 0) - (a.item.lastMentionedAt ?? 0);
        }
        return a.item.path.length - b.item.path.length;
      })
      .slice(0, 20)
      .map((m) => m.item);
  }

  private fuzzyMatch(text: string, query: string): boolean {
    let queryIndex = 0;
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === query.length;
  }

  dispose() {
    if (this.watcher) {
      this.watcher.close();
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveToDisk();
    }
  }
}
