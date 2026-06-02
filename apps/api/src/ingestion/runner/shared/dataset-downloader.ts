import { buildCsvDownloadPlan } from '@/ingestion/csv-downloads/csv-download-plan';
import { downloadCsvPlanItem } from '@/ingestion/csv-downloads/csv-downloader';

export type DatasetDownloadOutcome =
  | { ok: true }
  | { ok: false; failures: readonly { year: number; reason: string }[] };

export type DatasetDownloader = {
  download(years: readonly number[]): Promise<DatasetDownloadOutcome>;
};

/**
 * Aciona o downloader existente apenas para o dataset alvo dos anos derivados
 * como necessários, sem reimplementar transporte/retry (ADR 0012). O download é
 * aditivo e idempotente: o item é pulado quando o arquivo já existe.
 */
export function createDatasetDownloader(dataset: string): DatasetDownloader {
  return {
    async download(years): Promise<DatasetDownloadOutcome> {
      const plan = buildCsvDownloadPlan({
        years,
        force: false,
        datasets: [dataset],
      });

      const failures: { year: number; reason: string }[] = [];

      for (let index = 0; index < plan.length; index += 1) {
        const item = plan[index];
        const result = await downloadCsvPlanItem(item);

        if (result.status === 'failed') {
          failures.push({ year: years[index], reason: result.message });
        }
      }

      return failures.length === 0 ? { ok: true } : { ok: false, failures };
    },
  };
}
