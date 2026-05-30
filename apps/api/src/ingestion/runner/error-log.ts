import type { Rejection } from './ingestion-runner.types';

export type ErrorLogFileSystem = {
  mkdir(path: string): Promise<void>;
  writeFile(path: string, content: string): Promise<void>;
};

export type WriteErrorLogOptions = {
  fileSystem: ErrorLogFileSystem;
  now: () => Date;
  directory?: string;
};

const defaultDirectory = 'data/logs/errors';

export async function writeErrorLog(
  rejections: readonly Rejection[],
  options: WriteErrorLogOptions,
): Promise<string> {
  const directory = options.directory ?? defaultDirectory;
  const path = `${directory}/errors-${timestamp(options.now())}.log`;
  const content = rejections
    .map((rejection) => JSON.stringify(rejection))
    .join('\n');

  await options.fileSystem.mkdir(directory);
  await options.fileSystem.writeFile(path, `${content}\n`);

  return path;
}

function timestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}
