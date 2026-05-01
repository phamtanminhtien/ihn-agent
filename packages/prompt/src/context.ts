import os from 'node:os';

import type { EnvironmentSnapshot } from '@ihn-agent/types';

export class ContextManager {
  async getSnapshot(): Promise<EnvironmentSnapshot> {
    return {
      os: `${os.type()} ${os.release()}`,
      platform: os.platform(),
      arch: os.arch(),
      cwd: process.cwd(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
    };
  }
}
