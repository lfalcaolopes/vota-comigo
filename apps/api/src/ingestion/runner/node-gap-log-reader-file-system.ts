import { readFile } from 'node:fs/promises';

import type { GapLogReaderFileSystem } from './gap-log-reader';

export const nodeGapLogReaderFileSystem: GapLogReaderFileSystem = {
  async readFile(path) {
    return readFile(path, 'utf8');
  },
};
