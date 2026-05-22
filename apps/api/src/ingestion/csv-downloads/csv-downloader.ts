import { buildCsvDownloadPlan } from './csv-download-plan';
import { resolveCsvDownloaderConfig } from './csv-downloader-config';
import type {
  CsvDownloaderOptions,
  CsvDownloaderResult,
} from './csv-downloader.types';

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
