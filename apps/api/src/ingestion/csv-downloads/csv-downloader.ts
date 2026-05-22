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

    const response = await transport(item.url);

    if (!response.ok) {
      return {
        status: 'failed',
        item,
        message: `${item.filename}: ${response.status} ${response.statusText}`,
      };
    }

    await fileSystem.write(temporaryPath, response.body);
    await fileSystem.rename(temporaryPath, item.localPath);

    return {
      status: 'downloaded',
      item,
      message: `${item.filename} baixado com sucesso.`,
    };
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

const fetchCsv: CsvDownloadTransport = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
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

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function responseBody(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<Uint8Array> {
  return body;
}
