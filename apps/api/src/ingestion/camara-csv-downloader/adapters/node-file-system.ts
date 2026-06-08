import { createWriteStream } from 'node:fs';
import { access, mkdir, rename, rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { CsvPlanItemFileSystem } from '../types/csv-downloader.types';

export const nodeFileSystem: CsvPlanItemFileSystem = {
  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return false;
      }

      throw error;
    }
  },
  async mkdir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  },
  async remove(path: string): Promise<void> {
    await rm(path, { force: true });
  },
  async write(path: string, body: AsyncIterable<Uint8Array>): Promise<void> {
    await pipeline(Readable.from(body), createWriteStream(path));
  },
  async rename(from: string, to: string): Promise<void> {
    await rename(from, to);
  },
};

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
