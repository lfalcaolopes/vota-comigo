import { downloadCsvPlanItem } from '@/ingestion/camara-csv-downloader/download/download-csv-plan-item';
import { buildCsvDownloadPlan } from '@/ingestion/camara-csv-downloader/plan/csv-download-plan';
import type {
  CsvDownloadPlanItem,
  CsvPlanItemDownloaderOptions,
  CsvPlanItemDownloadResult,
} from '@/ingestion/camara-csv-downloader/types/csv-downloader.types';
import type { IngestionReporter } from '../types/ingestion-pipeline-runner.types';

export type DatasetDownloadOutcome =
  | { ok: true }
  | { ok: false; failures: readonly { year: number; reason: string }[] };

export type DatasetDownloadProgressReporter = Pick<
  IngestionReporter,
  'log' | 'status' | 'error'
>;

export type DatasetDownloadOptions = {
  reporter?: DatasetDownloadProgressReporter;
  // Prefix that scopes the progress lines (e.g. '[proposicoes]', '[tema]').
  label?: string;
};

export type DatasetDownloader = {
  download(
    years: readonly number[],
    options?: DatasetDownloadOptions,
  ): Promise<DatasetDownloadOutcome>;
};

export type DatasetDownloaderDeps = {
  downloadItem?: (
    item: CsvDownloadPlanItem,
    options?: CsvPlanItemDownloaderOptions,
  ) => Promise<CsvPlanItemDownloadResult>;
};

/**
 * Aciona o downloader existente apenas para o dataset alvo dos anos derivados
 * como necessários, sem reimplementar transporte/retry (ADR 0012). O download é
 * aditivo e idempotente: o item é pulado quando o arquivo já existe.
 */
export function createDatasetDownloader(
  dataset: string,
  deps: DatasetDownloaderDeps = {},
): DatasetDownloader {
  const downloadItem = deps.downloadItem ?? downloadCsvPlanItem;

  return {
    async download(years, options = {}): Promise<DatasetDownloadOutcome> {
      const reporter = options.reporter;
      const label = options.label ?? `[${dataset}]`;
      const plan = buildCsvDownloadPlan({
        years,
        force: false,
        datasets: [dataset],
      });

      const failures: { year: number; reason: string }[] = [];
      let downloaded = 0;
      let skipped = 0;

      for (let index = 0; index < plan.length; index += 1) {
        const item = plan[index];

        reporter?.status?.(
          `${label} baixando ${item.filename} [${index + 1}/${plan.length}]`,
        );

        const result = await downloadItem(item);

        if (result.status === 'failed') {
          failures.push({ year: years[index], reason: result.message });
          reporter?.error?.(
            `${label} falha ao baixar ${item.filename}: ${result.message}`,
          );
          continue;
        }

        if (result.status === 'skipped') {
          skipped += 1;
          continue;
        }

        downloaded += 1;
      }

      reporter?.log?.(
        `${label} download concluído: ${downloaded} baixada(s), ${skipped} pulada(s), ${failures.length} falha(s)`,
      );

      return failures.length === 0 ? { ok: true } : { ok: false, failures };
    },
  };
}
