import { resolveCsvDownloaderConfig } from './config/csv-downloader.config';
import { downloadCsvPlan } from './download/download-csv-plan';
import { downloadCsvPlanItem } from './download/download-csv-plan-item';
import {
  formatCsvPlanItemDownloadResult,
  reportCsvDownloadSummary,
  summarizeCsvDownloads,
} from './download/csv-download-summary';
import { buildCsvDownloadPlan } from './plan/csv-download-plan';
import type {
  CsvDownloaderExecutionOptions,
  CsvDownloaderExecutionResult,
  CsvDownloaderOptions,
  CsvDownloaderResult,
} from './types/csv-downloader.types';

export function runCsvDownloader(
  args: readonly string[],
  options: CsvDownloaderOptions = {},
): CsvDownloaderResult {
  const downloaderArgs = args[0] === '--' ? args.slice(1) : args;
  const resolution = resolveCsvDownloaderConfig(downloaderArgs, options);

  if (!resolution.ok) {
    return {
      ok: false,
      message: resolution.message,
      args: downloaderArgs,
    };
  }

  return {
    ok: true,
    message: 'Downloader de CSVs invocado com sucesso.',
    args: downloaderArgs,
    config: resolution.config,
    plan: buildCsvDownloadPlan(resolution.config, options),
  };
}

export async function executeCsvDownloader(
  args: readonly string[],
  options: CsvDownloaderExecutionOptions = {},
): Promise<CsvDownloaderExecutionResult> {
  const result = runCsvDownloader(args, options);

  if (!result.ok) {
    return {
      ...result,
      exitCode: 1,
    };
  }

  const results = await downloadCsvPlan(result.plan, {
    downloadItem: options.downloadItem ?? downloadCsvPlanItem,
    force: result.config.force,
    onResult: (itemResult) => {
      options.reporter?.log(formatCsvPlanItemDownloadResult(itemResult));
    },
  });

  const summary = summarizeCsvDownloads(results);
  reportCsvDownloadSummary(summary, options.reporter);

  return {
    ...result,
    results,
    summary,
    exitCode: summary.failed > 0 ? 1 : 0,
  };
}
