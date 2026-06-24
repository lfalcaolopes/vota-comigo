import type { CsvDownloadFailureSummary } from '../types/csv-downloader.types';

// Reexecutar o downloader sem --force pula arquivos já presentes, então o
// comando pode sobrepor a combinação dataset x ano sem custo de re-download.
export function formatResumeCommand(
  failures: readonly CsvDownloadFailureSummary[],
): string | undefined {
  if (failures.length === 0) {
    return undefined;
  }

  const datasets = unique(failures.map((failure) => failure.dataset));
  const years = unique(
    failures
      .map((failure) => yearFromFilename(failure.filename))
      .filter((year): year is number => year !== undefined),
  ).sort((left, right) => left - right);

  const datasetFlag = `--dataset=${datasets.join(',')}`;
  const yearsFlag = years.length > 0 ? ` --years=${years.join(',')}` : '';

  return `pnpm download:csvs -- ${datasetFlag}${yearsFlag}`;
}

function yearFromFilename(filename: string): number | undefined {
  const match = filename.match(/-(\d{4})\.csv$/);

  return match === null ? undefined : Number(match[1]);
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
