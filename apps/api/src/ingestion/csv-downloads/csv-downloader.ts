import { dirname } from 'node:path';

import { buildCsvDownloadPlan } from './csv-download-plan';
import { resolveCsvDownloaderConfig } from './csv-downloader.config';
import type {
  CsvDownloadTransport,
  CsvDownloaderExecutionOptions,
  CsvDownloaderExecutionResult,
  CsvDownloaderOptions,
  CsvDownloaderResult,
  CsvDownloadSummary,
  CsvDownloadPlanItem,
  CsvPlanItemDownloadResult,
  CsvPlanItemDownloaderOptions,
} from './csv-downloader.types';
import { fetchCsv } from './fetch-csv-transport';
import {
  InactivityTimeoutError,
  bodyWithInactivityTimeout,
  withInactivityTimeout,
} from './inactivity-timeout';
import { nodeFileSystem } from './node-file-system';
import {
  attemptsExhaustedError,
  backoffDelayMs,
  isTransientHttpStatus,
  retryDelayMs,
} from './retry-policy';

const maxConcurrentCsvDownloads = 3;

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

async function downloadCsvPlan(
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

function formatCsvPlanItemDownloadResult(
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

function reportCsvDownloadSummary(
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
}

export async function downloadCsvPlanItem(
  item: CsvDownloadPlanItem,
  options: CsvPlanItemDownloaderOptions = {},
): Promise<CsvPlanItemDownloadResult> {
  const force = options.force ?? false;
  const fileSystem = options.fileSystem ?? nodeFileSystem;
  const transport = options.transport ?? fetchCsv;
  const inactivityTimeoutMs = options.inactivityTimeoutMs ?? 60_000;
  const maxAttempts = options.maxAttempts ?? 3;
  const retryBackoffMs = options.retryBackoffMs ?? [1000, 2000];
  const sleep = options.sleep ?? sleepFor;
  const temporaryPath = `${item.localPath}.tmp`;

  try {
    if (!force && (await fileSystem.exists(item.localPath))) {
      return {
        status: 'skipped',
        item,
        message: `${item.filename} já existe, pulando.`,
      };
    }

    await fileSystem.mkdir(dirname(item.localPath));
    await fileSystem.remove(temporaryPath);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const abortController = new AbortController();
      let response: Awaited<ReturnType<CsvDownloadTransport>>;

      try {
        response = await withInactivityTimeout(
          transport(item.url, {
            signal: abortController.signal,
          }),
          inactivityTimeoutMs,
          abortController,
        );
      } catch (error) {
        if (attempt < maxAttempts) {
          await sleep(backoffDelayMs(attempt, retryBackoffMs));
          continue;
        }

        throw attemptsExhaustedError(errorMessage(error), maxAttempts);
      }

      if (!response.ok) {
        const isTransient = isTransientHttpStatus(response.status);

        if (isTransient && attempt < maxAttempts) {
          await sleep(retryDelayMs(response, attempt, retryBackoffMs));
          continue;
        }

        return {
          status: 'failed',
          item,
          message: `${item.filename}: ${response.status} ${
            response.statusText
          }${isTransient ? ` após ${maxAttempts} tentativas` : ''}`,
        };
      }

      try {
        await fileSystem.write(
          temporaryPath,
          bodyWithInactivityTimeout(
            response.body,
            inactivityTimeoutMs,
            abortController,
          ),
        );
        await fileSystem.rename(temporaryPath, item.localPath);
      } catch (error) {
        if (error instanceof InactivityTimeoutError && attempt < maxAttempts) {
          await sleep(backoffDelayMs(attempt, retryBackoffMs));
          continue;
        }

        if (error instanceof InactivityTimeoutError) {
          throw attemptsExhaustedError(error.message, maxAttempts);
        }

        throw error;
      }

      return {
        status: 'downloaded',
        item,
        message: `${item.filename} baixado com sucesso.`,
      };
    }

    throw new Error('tentativas esgotadas');
  } catch (error) {
    return {
      status: 'failed',
      item,
      message: `${item.filename}: ${errorMessage(error)}`,
      error,
    };
  }
}

function summarizeCsvDownloads(
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

function failureReason(
  result: Extract<CsvPlanItemDownloadResult, { status: 'failed' }>,
): string {
  return result.message.replace(`${result.item.filename}: `, '');
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function sleepFor(durationMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
}
