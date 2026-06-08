import { mkdir, writeFile } from 'node:fs/promises';

import type { ErrorLogFileSystem } from './error-log';

export const nodeErrorLogFileSystem: ErrorLogFileSystem = {
  async mkdir(path) {
    await mkdir(path, { recursive: true });
  },
  async writeFile(path, content) {
    await writeFile(path, content, 'utf8');
  },
};
