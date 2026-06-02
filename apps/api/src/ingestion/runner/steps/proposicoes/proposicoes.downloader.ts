import { buildCsvDownloadPlan } from '@/ingestion/csv-downloads/csv-download-plan';
import { downloadCsvPlanItem } from '@/ingestion/csv-downloads/csv-downloader';
import type {
  ProposicaoDownloader,
  ProposicaoDownloadOutcome,
} from './proposicoes.step';

/**
 * Aciona o downloader existente apenas para o dataset `proposicoes` dos anos
 * derivados como necessários, sem reimplementar transporte/retry (ADR 0012).
 * O download é aditivo e idempotente: o item é pulado quando o arquivo já existe.
 */
export function createProposicaoDownloader(): ProposicaoDownloader {
  return {
    async download(years): Promise<ProposicaoDownloadOutcome> {
      const plan = buildCsvDownloadPlan({
        years,
        force: false,
        datasets: ['proposicoes'],
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
