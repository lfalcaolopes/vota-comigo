import type {
  CsvDownloaderExecutionOptions,
  CsvDownloadSummary,
  CsvPlanItemDownloadResult,
} from '../types/csv-downloader.types';
import { formatResumeCommand } from './resume-command';

export function summarizeCsvDownloads(
  results: readonly CsvPlanItemDownloadResult[],
): CsvDownloadSummary {
  return results.reduce<CsvDownloadSummary>(
    (summary, result) => {
      if (result.status === 'downloaded') {
        return {
          ...summary,
          downloaded: summary.downloaded + 1,
        };
      }

      if (result.status === 'skipped') {
        return {
          ...summary,
          skipped: summary.skipped + 1,
        };
      }

      return {
        ...summary,
        failed: summary.failed + 1,
        failures: [
          ...summary.failures,
          {
            dataset: result.item.dataset,
            filename: result.item.filename,
            reason: failureReason(result),
          },
        ],
      };
    },
    {
      downloaded: 0,
      skipped: 0,
      failed: 0,
      failures: [],
    },
  );
}

export function formatCsvPlanItemDownloadResult(
  result: CsvPlanItemDownloadResult,
): string {
  if (result.status === 'downloaded') {
    return `[${result.item.filename}] baixado`;
  }

  if (result.status === 'skipped') {
    return `[${result.item.filename}] pulado`;
  }

  return `[${result.item.filename}] falhou: ${failureReason(result)}`;
}

export function reportCsvDownloadSummary(
  summary: CsvDownloadSummary,
  reporter: CsvDownloaderExecutionOptions['reporter'],
): void {
  if (reporter === undefined) {
    return;
  }

  reporter.log(
    `Resumo: ${summary.downloaded} baixados, ${summary.skipped} pulados, ${summary.failed} erros.`,
  );

  if (summary.failures.length === 0) {
    return;
  }

  reporter.log('Falhas:');

  for (const failure of summary.failures) {
    reporter.log(`  - ${failure.filename}: ${failure.reason}`);
  }

  const resumeCommand = formatResumeCommand(summary.failures);

  if (resumeCommand !== undefined) {
    reporter.log('Para baixar apenas os que faltam, execute:');
    reporter.log(`  ${resumeCommand}`);
  }
}

function failureReason(
  result: Extract<CsvPlanItemDownloadResult, { status: 'failed' }>,
): string {
  return result.message.replace(`${result.item.filename}: `, '');
}
