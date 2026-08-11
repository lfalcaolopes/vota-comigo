import { dirname } from 'node:path';

import { fetchCsv } from '../adapters/fetch-csv-transport';
import { nodeFileSystem } from '../adapters/node-file-system';
import { extractZipEntry } from '../adapters/zip-archive-extractor';
import {
  InactivityTimeoutError,
  bodyWithInactivityTimeout,
  withInactivityTimeout,
} from '../resilience/inactivity-timeout';
import {
  attemptsExhaustedError,
  backoffDelayMs,
  isTransientHttpStatus,
  retryDelayMs,
} from '../resilience/retry-policy';
import type {
  CsvDownloadPlanItem,
  CsvDownloadTransport,
  CsvPlanItemDownloaderOptions,
  CsvPlanItemDownloadResult,
  CsvPlanItemFileSystem,
} from '../types/csv-downloader.types';

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
  const extractArchive = options.extractArchive ?? extractZipEntry;
  const temporaryPath = `${item.localPath}.tmp`;
  const downloadPath =
    item.archive === undefined ? temporaryPath : `${item.localPath}.zip.tmp`;

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

    if (downloadPath !== temporaryPath) {
      await fileSystem.remove(downloadPath);
    }

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
          downloadPath,
          bodyWithInactivityTimeout(
            response.body,
            inactivityTimeoutMs,
            abortController,
          ),
        );

        if (item.archive !== undefined) {
          await extractArchive({
            archivePath: downloadPath,
            entryName: item.archive.entryName,
            destinationPath: temporaryPath,
          });
          await fileSystem.remove(downloadPath);
        }

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
    await discardTemporaryFiles(fileSystem, [temporaryPath, downloadPath]);

    return {
      status: 'failed',
      item,
      message: `${item.filename}: ${errorMessage(error)}`,
      error,
    };
  }
}

async function discardTemporaryFiles(
  fileSystem: CsvPlanItemFileSystem,
  paths: readonly string[],
): Promise<void> {
  for (const path of new Set(paths)) {
    try {
      await fileSystem.remove(path);
    } catch {
      // A falha original é o que importa; sobra de temporário não a substitui.
    }
  }
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
