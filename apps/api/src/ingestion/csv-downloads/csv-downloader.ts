import { createWriteStream } from 'node:fs';
import { access, mkdir, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { buildCsvDownloadPlan } from './csv-download-plan';
import { resolveCsvDownloaderConfig } from './csv-downloader-config';
import type {
  CsvDownloadTransport,
  CsvDownloaderOptions,
  CsvDownloaderResult,
  CsvDownloadPlanItem,
  CsvPlanItemDownloadResult,
  CsvPlanItemDownloaderOptions,
  CsvPlanItemFileSystem,
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
        response = await responseWithInactivityTimeout(
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

const nodeFileSystem: CsvPlanItemFileSystem = {
  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return false;
      }

      throw error;
    }
  },
  async mkdir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  },
  async remove(path: string): Promise<void> {
    await rm(path, { force: true });
  },
  async write(path: string, body: AsyncIterable<Uint8Array>): Promise<void> {
    await pipeline(Readable.from(body), createWriteStream(path));
  },
  async rename(from: string, to: string): Promise<void> {
    await rename(from, to);
  },
};

const fetchCsv: CsvDownloadTransport = async (url, options) => {
  const response = await fetch(url, {
    signal: options.signal,
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
      retryAfter: response.headers.get('Retry-After') ?? undefined,
    };
  }

  if (response.body === null) {
    return {
      ok: false,
      status: response.status,
      statusText: 'Resposta sem corpo.',
    };
  }

  return {
    ok: true,
    body: responseBody(response.body),
  };
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

class InactivityTimeoutError extends Error {
  constructor() {
    super('timeout por inatividade');
  }
}

function attemptsExhaustedError(reason: string, maxAttempts: number): Error {
  return new Error(`${reason} após ${maxAttempts} tentativas`);
}

function isTransientHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function retryDelayMs(
  response: { status: number; retryAfter?: string },
  attempt: number,
  retryBackoffMs: readonly number[],
): number {
  if (response.status === 429 && response.retryAfter !== undefined) {
    const retryAfterMs = parseRetryAfterMs(response.retryAfter);

    if (retryAfterMs !== undefined) {
      return retryAfterMs;
    }
  }

  return retryBackoffMs[attempt - 1] ?? retryBackoffMs.at(-1) ?? 0;
}

function backoffDelayMs(
  attempt: number,
  retryBackoffMs: readonly number[],
): number {
  return retryBackoffMs[attempt - 1] ?? retryBackoffMs.at(-1) ?? 0;
}

function parseRetryAfterMs(value: string): number | undefined {
  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(value);

  if (!Number.isNaN(retryAt)) {
    return Math.max(0, retryAt - Date.now());
  }

  return undefined;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function responseBody(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<Uint8Array> {
  return body;
}

function bodyWithInactivityTimeout(
  body: AsyncIterable<Uint8Array>,
  inactivityTimeoutMs: number,
  abortController: AbortController,
): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      const iterator = body[Symbol.asyncIterator]();

      try {
        while (true) {
          const result = await nextChunkWithTimeout(
            iterator,
            inactivityTimeoutMs,
            abortController,
          );

          if (result.done === true) {
            return;
          }

          yield result.value;
        }
      } finally {
        await iterator.return?.();
      }
    },
  };
}

async function responseWithInactivityTimeout<T>(
  response: Promise<T>,
  inactivityTimeoutMs: number,
  abortController: AbortController,
): Promise<T> {
  return withInactivityTimeout(response, inactivityTimeoutMs, abortController);
}

async function nextChunkWithTimeout(
  iterator: AsyncIterator<Uint8Array>,
  inactivityTimeoutMs: number,
  abortController: AbortController,
): Promise<IteratorResult<Uint8Array>> {
  return withInactivityTimeout(
    iterator.next(),
    inactivityTimeoutMs,
    abortController,
  );
}

async function withInactivityTimeout<T>(
  operation: Promise<T>,
  inactivityTimeoutMs: number,
  abortController: AbortController,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          abortController.abort();
          reject(new InactivityTimeoutError());
        }, inactivityTimeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

async function sleepFor(durationMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
}
