import type { ExternalGap } from './ingestion-runner.types';

export type GapLogFileSystem = {
  mkdir(path: string): Promise<void>;
  writeFile(path: string, content: string): Promise<void>;
};

export type WriteGapLogOptions = {
  fileSystem: GapLogFileSystem;
  now: () => Date;
  directory?: string;
};

const defaultDirectory = 'data/logs/gaps';

export async function writeGapLog(
  gaps: readonly ExternalGap[],
  options: WriteGapLogOptions,
): Promise<string> {
  const directory = options.directory ?? defaultDirectory;
  const path = `${directory}/gaps-${timestamp(options.now())}.log`;
  const content = gaps.map((gap) => JSON.stringify(gap)).join('\n');

  await options.fileSystem.mkdir(directory);
  await options.fileSystem.writeFile(path, `${content}\n`);

  return path;
}

function timestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}
