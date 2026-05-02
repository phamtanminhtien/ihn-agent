import { FileTreeCache } from '@ihn-agent/cache';

export const fileTreeCache = new FileTreeCache({
  rootPath: process.cwd(),
  persist: true,
});

// Initialize in background
fileTreeCache.initialize().catch((err) => {
  console.error('Failed to initialize file tree cache:', err);
});

// Handle graceful shutdown
process.on('exit', () => {
  fileTreeCache.dispose();
});
process.on('SIGINT', () => {
  fileTreeCache.dispose();
  process.exit();
});
process.on('SIGTERM', () => {
  fileTreeCache.dispose();
  process.exit();
});
