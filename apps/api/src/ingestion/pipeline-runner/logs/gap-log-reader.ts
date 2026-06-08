import type { ExternalGap } from '../types/ingestion-pipeline-runner.types';

export type GapLogReaderFileSystem = {
  readFile(path: string): Promise<string>;
};

const RETRY_FILE = 'deputado_historico';
const RETRY_TYPE = 'fonte_externa_indisponivel';

export async function readGapLog(
  path: string,
  fileSystem: GapLogReaderFileSystem,
): Promise<readonly ExternalGap[]> {
  const content = await fileSystem.readFile(path);

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map(parseGap)
    .filter((gap): gap is ExternalGap => gap !== null);
}

export function selectRetryReferences(
  gaps: readonly ExternalGap[],
): readonly number[] {
  const references = new Set<number>();

  for (const gap of gaps) {
    if (gap.file !== RETRY_FILE || gap.type !== RETRY_TYPE) {
      continue;
    }

    const reference = Number(gap.reference);

    if (Number.isInteger(reference)) {
      references.add(reference);
    }
  }

  return [...references];
}

function parseGap(line: string): ExternalGap | null {
  try {
    const parsed: unknown = JSON.parse(line);

    if (!isExternalGap(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isExternalGap(value: unknown): value is ExternalGap {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.file === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.reference === 'string' &&
    typeof candidate.message === 'string'
  );
}
