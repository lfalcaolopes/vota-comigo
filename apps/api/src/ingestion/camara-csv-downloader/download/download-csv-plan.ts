import type {
  CsvDownloadPlanItem,
  CsvPlanItemDownloaderOptions,
  CsvPlanItemDownloadResult,
} from '../types/csv-downloader.types';

const maxConcurrentCsvDownloads = 3;

export async function downloadCsvPlan(
  plan: readonly CsvDownloadPlanItem[],
  options: {
    downloadItem: (
      item: CsvDownloadPlanItem,
      options: CsvPlanItemDownloaderOptions,
    ) => Promise<CsvPlanItemDownloadResult>;
    force: boolean;
    onResult?: (result: CsvPlanItemDownloadResult) => void;
  },
): Promise<CsvPlanItemDownloadResult[]> {
  const results: CsvPlanItemDownloadResult[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < plan.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = plan[index];

      const result = await options.downloadItem(item, {
        force: options.force,
      });
      results[index] = result;
      options.onResult?.(result);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(maxConcurrentCsvDownloads, plan.length) },
      () => worker(),
    ),
  );

  return results;
}
