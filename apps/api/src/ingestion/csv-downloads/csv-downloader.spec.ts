import { Readable } from 'node:stream';

import { resolveCsvDownloaderConfig } from './csv-downloader-config';
import { buildCsvDownloadPlan } from './csv-download-plan';
import {
  downloadCsvPlanItem,
  executeCsvDownloader,
  runCsvDownloader,
} from './csv-downloader';
import type {
  CsvDownloadPlanItem,
  CsvDownloadTransport,
  CsvPlanItemFileSystem,
} from './csv-downloader.types';

describe('csv downloader entrypoint', () => {
  describe('when building the download plan', () => {
    it('includes the annual datasets and single files for the default temporal window', () => {
      // Arrange
      const config = {
        force: false,
        years: [2001, 2002, 2003],
      };

      // Act
      const plan = buildCsvDownloadPlan(config);

      // Assert
      expect(plan).toHaveLength(20);
      expect(plan).toContainEqual({
        dataset: 'deputados',
        filename: 'deputados.csv',
        url: 'https://dadosabertos.camara.leg.br/arquivos/deputados/csv/deputados.csv',
        localPath: 'data/raw/deputados/deputados.csv',
      });
      expect(plan).toContainEqual({
        dataset: 'legislaturas',
        filename: 'legislaturas.csv',
        url: 'https://dadosabertos.camara.leg.br/arquivos/legislaturas/csv/legislaturas.csv',
        localPath: 'data/raw/legislaturas/legislaturas.csv',
      });
      expect(plan).toContainEqual({
        dataset: 'votacoes',
        filename: 'votacoes-2001.csv',
        url: 'https://dadosabertos.camara.leg.br/arquivos/votacoes/csv/votacoes-2001.csv',
        localPath: 'data/raw/votacoes/votacoes-2001.csv',
      });
      expect(plan).toContainEqual({
        dataset: 'proposicoesTemas',
        filename: 'proposicoesTemas-2003.csv',
        url: 'https://dadosabertos.camara.leg.br/arquivos/proposicoesTemas/csv/proposicoesTemas-2003.csv',
        localPath: 'data/raw/proposicoesTemas/proposicoesTemas-2003.csv',
      });
    });
  });

  describe('when resolving configuration in isolation', () => {
    it('returns the temporal window and overwrite policy without invoking the downloader entrypoint', () => {
      // Arrange
      const args = ['--force', '--from=2024', '--to=2025'];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution).toEqual({
        ok: true,
        config: {
          force: true,
          years: [2024, 2025],
        },
      });
    });
  });

  describe('when downloading a single plan item', () => {
    const item: CsvDownloadPlanItem = {
      dataset: 'votacoes',
      filename: 'votacoes-2025.csv',
      url: 'https://example.test/arquivos/votacoes/csv/votacoes-2025.csv',
      localPath: 'data/raw/votacoes/votacoes-2025.csv',
    };

    it('skips the download when the final file exists and force is disabled', async () => {
      // Arrange
      const fileSystem = createFileSystem({
        exists: jest.fn().mockResolvedValue(true),
      });
      const transport = jest.fn();

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        transport,
      });

      // Assert
      expect(result).toEqual({
        status: 'skipped',
        item,
        message: 'votacoes-2025.csv já existe, pulando.',
      });
      expect(transport).not.toHaveBeenCalled();
      expect(fileSystem.remove.mock.calls).toHaveLength(0);
      expect(fileSystem.write.mock.calls).toHaveLength(0);
      expect(fileSystem.rename.mock.calls).toHaveLength(0);
    });

    it('downloads and replaces the final file when force is enabled', async () => {
      // Arrange
      const body = csvBody('id,data\n1,2025\n');
      const fileSystem = createFileSystem({
        exists: jest.fn().mockResolvedValue(true),
      });
      const transport = createTransport(body);

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        force: true,
        transport,
      });

      // Assert
      expect(result).toEqual({
        status: 'downloaded',
        item,
        message: 'votacoes-2025.csv baixado com sucesso.',
      });
      expect(transport).toHaveBeenCalledWith(item.url, {
        signal: expect.any(AbortSignal) as AbortSignal,
      });
      expect(fileSystem.mkdir.mock.calls).toContainEqual(['data/raw/votacoes']);
      expect(fileSystem.remove.mock.calls).toContainEqual([
        'data/raw/votacoes/votacoes-2025.csv.tmp',
      ]);
      expect(fileSystem.write.mock.calls).toContainEqual([
        'data/raw/votacoes/votacoes-2025.csv.tmp',
        expect.anything(),
      ]);
      expect(fileSystem.rename.mock.calls).toContainEqual([
        'data/raw/votacoes/votacoes-2025.csv.tmp',
        item.localPath,
      ]);
    });

    it('writes to a temporary file before promoting a successful download', async () => {
      // Arrange
      const body = csvBody('id,data\n2,2025\n');
      const fileSystem = createFileSystem();
      const transport = createTransport(body);

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        transport,
      });

      // Assert
      expect(result.status).toBe('downloaded');
      expect(fileSystem.write.mock.calls).toContainEqual([
        'data/raw/votacoes/votacoes-2025.csv.tmp',
        expect.anything(),
      ]);
      expect(fileSystem.rename.mock.calls).toContainEqual([
        'data/raw/votacoes/votacoes-2025.csv.tmp',
        item.localPath,
      ]);
    });

    it('replaces an orphan temporary file instead of treating it as downloaded input', async () => {
      // Arrange
      const body = csvBody('id,data\n3,2025\n');
      const fileSystem = createFileSystem({
        exists: jest
          .fn()
          .mockImplementation((path: string) =>
            Promise.resolve(path.endsWith('.tmp')),
          ),
      });
      const transport = createTransport(body);

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        transport,
      });

      // Assert
      expect(result.status).toBe('downloaded');
      expect(fileSystem.exists.mock.calls).toContainEqual([item.localPath]);
      expect(fileSystem.exists.mock.calls).not.toContainEqual([
        'data/raw/votacoes/votacoes-2025.csv.tmp',
      ]);
      expect(fileSystem.remove.mock.calls).toContainEqual([
        'data/raw/votacoes/votacoes-2025.csv.tmp',
      ]);
      expect(fileSystem.write.mock.calls).toContainEqual([
        'data/raw/votacoes/votacoes-2025.csv.tmp',
        expect.anything(),
      ]);
    });

    it('does not promote the temporary file when transport fails', async () => {
      // Arrange
      const fileSystem = createFileSystem();
      const transport: jest.MockedFunction<CsvDownloadTransport> = jest
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        });

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        transport,
      });

      // Assert
      expect(result).toEqual({
        status: 'failed',
        item,
        message: 'votacoes-2025.csv: 404 Not Found',
      });
      expect(fileSystem.write.mock.calls).toHaveLength(0);
      expect(fileSystem.rename.mock.calls).toHaveLength(0);
      expect(transport).toHaveBeenCalledTimes(1);
    });

    it('downloads the file after retrying a transient HTTP failure', async () => {
      // Arrange
      const body = csvBody('id,data\n5,2025\n');
      const fileSystem = createFileSystem();
      const transport: jest.MockedFunction<CsvDownloadTransport> = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          body,
        });
      const sleep = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        retryBackoffMs: [25],
        sleep,
        transport,
      });

      // Assert
      expect(result).toEqual({
        status: 'downloaded',
        item,
        message: 'votacoes-2025.csv baixado com sucesso.',
      });
      expect(transport).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledWith(25);
      expect(fileSystem.write.mock.calls).toContainEqual([
        'data/raw/votacoes/votacoes-2025.csv.tmp',
        expect.anything(),
      ]);
    });

    it('keeps the final failure reason after exhausting transient HTTP attempts', async () => {
      // Arrange
      const fileSystem = createFileSystem();
      const transport: jest.MockedFunction<CsvDownloadTransport> = jest
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        });
      const sleep = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        retryBackoffMs: [10, 20],
        sleep,
        transport,
      });

      // Assert
      expect(result).toEqual({
        status: 'failed',
        item,
        message: 'votacoes-2025.csv: 503 Service Unavailable após 3 tentativas',
      });
      expect(transport).toHaveBeenCalledTimes(3);
      expect(sleep.mock.calls).toEqual([[10], [20]]);
      expect(fileSystem.write.mock.calls).toHaveLength(0);
      expect(fileSystem.rename.mock.calls).toHaveLength(0);
    });

    it('respects Retry-After before retrying a rate-limited response', async () => {
      // Arrange
      const body = csvBody('id,data\n6,2025\n');
      const fileSystem = createFileSystem();
      const transport: jest.MockedFunction<CsvDownloadTransport> = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          retryAfter: '3',
        })
        .mockResolvedValueOnce({
          ok: true,
          body,
        });
      const sleep = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        retryBackoffMs: [999],
        sleep,
        transport,
      });

      // Assert
      expect(result.status).toBe('downloaded');
      expect(sleep).toHaveBeenCalledWith(3000);
      expect(transport).toHaveBeenCalledTimes(2);
    });

    it('uses the default backoff when a rate-limited response has no Retry-After', async () => {
      // Arrange
      const body = csvBody('id,data\n7,2025\n');
      const fileSystem = createFileSystem();
      const transport: jest.MockedFunction<CsvDownloadTransport> = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: true,
          body,
        });
      const sleep = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        retryBackoffMs: [75],
        sleep,
        transport,
      });

      // Assert
      expect(result.status).toBe('downloaded');
      expect(sleep).toHaveBeenCalledWith(75);
      expect(transport).toHaveBeenCalledTimes(2);
    });

    it('retries and reports failure when an attempt stops receiving bytes', async () => {
      // Arrange
      const fileSystem = createFileSystem({
        write: jest.fn(async (_path, body) => drainBody(body)),
      });
      const transport: jest.MockedFunction<CsvDownloadTransport> = jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({
            ok: true,
            body: delayedCsvBody('id,data\n8,2025\n', 20),
          }),
        );
      const sleep = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        inactivityTimeoutMs: 10,
        maxAttempts: 2,
        retryBackoffMs: [0],
        sleep,
        transport,
      });

      // Assert
      expect(result).toMatchObject({
        status: 'failed',
        item,
        message: 'votacoes-2025.csv: timeout por inatividade após 2 tentativas',
      });
      expect(
        result.status === 'failed' ? result.error : undefined,
      ).toBeInstanceOf(Error);
      expect(transport).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledWith(0);
      expect(fileSystem.rename.mock.calls).toHaveLength(0);
    });

    it('keeps long downloads valid while bytes keep arriving', async () => {
      // Arrange
      const receivedChunks: string[] = [];
      const fileSystem = createFileSystem({
        write: jest.fn(async (_path, body) => {
          for await (const chunk of body) {
            receivedChunks.push(Buffer.from(chunk).toString('utf8'));
          }
        }),
      });
      const transport = createTransport(
        delayedCsvChunks([
          ['id,', 5],
          ['data\n', 5],
          ['9,2025\n', 5],
        ]),
      );

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        inactivityTimeoutMs: 10,
        transport,
      });

      // Assert
      expect(result).toEqual({
        status: 'downloaded',
        item,
        message: 'votacoes-2025.csv baixado com sucesso.',
      });
      expect(receivedChunks).toEqual(['id,', 'data\n', '9,2025\n']);
      expect(fileSystem.rename.mock.calls).toContainEqual([
        'data/raw/votacoes/votacoes-2025.csv.tmp',
        item.localPath,
      ]);
    });

    it('retries when the transport produces no response before the inactivity timeout', async () => {
      // Arrange
      const fileSystem = createFileSystem({
        write: jest.fn(async (_path, body) => drainBody(body)),
      });
      const transport: jest.MockedFunction<CsvDownloadTransport> = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  ok: true,
                  body: csvBody('id,data\n10,2025\n'),
                });
              }, 20);
            }),
        );
      const sleep = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        inactivityTimeoutMs: 10,
        maxAttempts: 2,
        retryBackoffMs: [0],
        sleep,
        transport,
      });

      // Assert
      expect(result).toMatchObject({
        status: 'failed',
        item,
        message: 'votacoes-2025.csv: timeout por inatividade após 2 tentativas',
      });
      expect(
        result.status === 'failed' ? result.error : undefined,
      ).toBeInstanceOf(Error);
      expect(transport).toHaveBeenCalledTimes(2);
      expect(fileSystem.write.mock.calls).toHaveLength(0);
    });

    it('does not promote the temporary file when writing fails', async () => {
      // Arrange
      const writeError = new Error('stream interrompido');
      const fileSystem = createFileSystem({
        write: jest.fn().mockRejectedValue(writeError),
      });
      const transport = createTransport(csvBody('id,data\n4,2025\n'));

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        transport,
      });

      // Assert
      expect(result).toEqual({
        status: 'failed',
        item,
        message: 'votacoes-2025.csv: stream interrompido',
        error: writeError,
      });
      expect(fileSystem.rename.mock.calls).toHaveLength(0);
    });
  });

  describe('when invoked by the public command', () => {
    it('uses the full temporal window when no temporal flags are provided', () => {
      // Arrange
      const args: string[] = [];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2003 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2001, 2002, 2003],
        },
      });
    });

    it('returns a controlled success result', () => {
      // Arrange
      const args = ['--from=2020', '--to=2025'];

      // Act
      const result = runCsvDownloader(args);

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2020, 2021, 2022, 2023, 2024, 2025],
        },
      });
    });

    it('resolves a window starting from a specific year', () => {
      // Arrange
      const args = ['--from=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2024, 2025, 2026],
        },
      });
    });

    it('resolves a window ending at a specific year', () => {
      // Arrange
      const args = ['--to=2003'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2001, 2002, 2003],
        },
      });
    });

    it('resolves explicit years before interval flags', () => {
      // Arrange
      const args = ['--from=2020', '--to=2026', '--years=2021,2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2021, 2024],
        },
      });
    });

    it('creates a plan for explicit years resolved by the public command', () => {
      // Arrange
      const args = ['--years=2021,2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.plan).toHaveLength(14);
        expect(result.plan).toContainEqual({
          dataset: 'votacoesVotos',
          filename: 'votacoesVotos-2021.csv',
          url: 'https://dadosabertos.camara.leg.br/arquivos/votacoesVotos/csv/votacoesVotos-2021.csv',
          localPath: 'data/raw/votacoesVotos/votacoesVotos-2021.csv',
        });
        expect(result.plan).toContainEqual({
          dataset: 'proposicoes',
          filename: 'proposicoes-2024.csv',
          url: 'https://dadosabertos.camara.leg.br/arquivos/proposicoes/csv/proposicoes-2024.csv',
          localPath: 'data/raw/proposicoes/proposicoes-2024.csv',
        });
      }
    });

    it('resolves the last five years including the current year', () => {
      // Arrange
      const args = ['--last=5'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2022, 2023, 2024, 2025, 2026],
        },
      });
    });

    it('creates a plan for recent windows resolved by the public command', () => {
      // Arrange
      const args = ['--last=5'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.plan).toHaveLength(32);
        expect(result.plan).toContainEqual({
          dataset: 'votacoesObjetos',
          filename: 'votacoesObjetos-2022.csv',
          url: 'https://dadosabertos.camara.leg.br/arquivos/votacoesObjetos/csv/votacoesObjetos-2022.csv',
          localPath: 'data/raw/votacoesObjetos/votacoesObjetos-2022.csv',
        });
        expect(result.plan).toContainEqual({
          dataset: 'votacoesProposicoes',
          filename: 'votacoesProposicoes-2026.csv',
          url: 'https://dadosabertos.camara.leg.br/arquivos/votacoesProposicoes/csv/votacoesProposicoes-2026.csv',
          localPath:
            'data/raw/votacoesProposicoes/votacoesProposicoes-2026.csv',
        });
      }
    });

    it('uses a custom base URL when building the plan for tests', () => {
      // Arrange
      const args = ['--years=2025'];

      // Act
      const result = runCsvDownloader(args, {
        baseUrl: 'https://example.test/arquivos',
        currentYear: 2026,
      });

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.plan).toContainEqual({
          dataset: 'votacoes',
          filename: 'votacoes-2025.csv',
          url: 'https://example.test/arquivos/votacoes/csv/votacoes-2025.csv',
          localPath: 'data/raw/votacoes/votacoes-2025.csv',
        });
      }
    });

    it('resolves the last ten years including the current year', () => {
      // Arrange
      const args = ['--last=10'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      });
    });

    it('combines force with a valid temporal window', () => {
      // Arrange
      const args = ['--force', '--years=2023,2025'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: true,
          years: [2023, 2025],
        },
      });
    });

    it('ignores the pnpm argument separator', () => {
      // Arrange
      const args = ['--', '--from=2020', '--to=2025'];

      // Act
      const result = runCsvDownloader(args);

      // Assert
      expect(result.args).toEqual(['--from=2020', '--to=2025']);
    });
  });

  describe('when executing the public command', () => {
    it('processes every planned item and returns a successful exit code when no item fails', async () => {
      // Arrange
      const args = ['--years=2025'];
      const downloadItem = jest.fn((item: CsvDownloadPlanItem) => {
        if (item.filename === 'deputados.csv') {
          return Promise.resolve({
            status: 'skipped' as const,
            item,
            message: `${item.filename} já existe, pulando.`,
          });
        }

        return Promise.resolve({
          status: 'downloaded' as const,
          item,
          message: `${item.filename} baixado com sucesso.`,
        });
      });

      // Act
      const result = await executeCsvDownloader(args, {
        currentYear: 2026,
        downloadItem,
      });

      // Assert
      expect(downloadItem).toHaveBeenCalledTimes(8);
      expect(downloadItem.mock.calls.map(([item]) => item.filename)).toEqual([
        'deputados.csv',
        'legislaturas.csv',
        'votacoes-2025.csv',
        'votacoesVotos-2025.csv',
        'votacoesObjetos-2025.csv',
        'votacoesProposicoes-2025.csv',
        'proposicoes-2025.csv',
        'proposicoesTemas-2025.csv',
      ]);
      expect(result).toMatchObject({
        ok: true,
        exitCode: 0,
        summary: {
          downloaded: 7,
          skipped: 1,
          failed: 0,
          failures: [],
        },
      });
    });

    it('runs at most three downloads at the same time', async () => {
      // Arrange
      const args = ['--years=2025'];
      let activeDownloads = 0;
      let maxActiveDownloads = 0;
      const downloadItem = jest.fn(async (item: CsvDownloadPlanItem) => {
        activeDownloads += 1;
        maxActiveDownloads = Math.max(maxActiveDownloads, activeDownloads);

        await sleepForTest(5);

        activeDownloads -= 1;
        return {
          status: 'downloaded' as const,
          item,
          message: `${item.filename} baixado com sucesso.`,
        };
      });

      // Act
      const result = await executeCsvDownloader(args, {
        currentYear: 2026,
        downloadItem,
      });

      // Assert
      expect(result.exitCode).toBe(0);
      expect(downloadItem).toHaveBeenCalledTimes(8);
      expect(maxActiveDownloads).toBe(3);
    });

    it('continues after item failures and reports the final summary', async () => {
      // Arrange
      const args = ['--years=2025'];
      const output: string[] = [];
      const downloadItem = jest.fn((item: CsvDownloadPlanItem) => {
        if (item.filename === 'legislaturas.csv') {
          return Promise.resolve({
            status: 'failed' as const,
            item,
            message: `${item.filename}: 404 Not Found`,
          });
        }

        if (item.filename === 'deputados.csv') {
          return Promise.resolve({
            status: 'skipped' as const,
            item,
            message: `${item.filename} já existe, pulando.`,
          });
        }

        return Promise.resolve({
          status: 'downloaded' as const,
          item,
          message: `${item.filename} baixado com sucesso.`,
        });
      });

      // Act
      const result = await executeCsvDownloader(args, {
        currentYear: 2026,
        downloadItem,
        reporter: {
          log(message) {
            output.push(message);
          },
        },
      });

      // Assert
      expect(downloadItem).toHaveBeenCalledTimes(8);
      expect(result).toMatchObject({
        ok: true,
        exitCode: 1,
        summary: {
          downloaded: 6,
          skipped: 1,
          failed: 1,
          failures: [
            {
              filename: 'legislaturas.csv',
              reason: '404 Not Found',
            },
          ],
        },
      });
      expect(output).toEqual(
        expect.arrayContaining([
          '[deputados.csv] pulado',
          '[legislaturas.csv] falhou: 404 Not Found',
          'Resumo: 6 baixados, 1 pulados, 1 erros.',
          'Falhas:',
          '  - legislaturas.csv: 404 Not Found',
        ]),
      );
    });
  });

  describe('when invoked with invalid configuration', () => {
    it('rejects last combined with explicit years', () => {
      // Arrange
      const args = ['--last=5', '--years=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message:
          '--last não pode ser combinado com --years, --from ou --to. Escolha apenas uma forma de janela temporal.',
        args,
      });
    });

    it('rejects last combined with an interval start', () => {
      // Arrange
      const args = ['--last=5', '--from=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message:
          '--last não pode ser combinado com --years, --from ou --to. Escolha apenas uma forma de janela temporal.',
        args,
      });
    });

    it('rejects last combined with an interval end', () => {
      // Arrange
      const args = ['--last=5', '--to=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message:
          '--last não pode ser combinado com --years, --from ou --to. Escolha apenas uma forma de janela temporal.',
        args,
      });
    });

    it('rejects unsupported last windows', () => {
      // Arrange
      const args = ['--last=3'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: '--last aceita apenas os valores 5 ou 10.',
        args,
      });
    });

    it('rejects years outside the valid range', () => {
      // Arrange
      const args = ['--years=2000,2025'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: 'Ano 2000 inválido. Use anos entre 2001 e 2026.',
        args,
      });
      expect(result).not.toHaveProperty('plan');
    });

    it('rejects interval years outside the valid range', () => {
      // Arrange
      const args = ['--from=2000', '--to=2025'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: 'Ano 2000 inválido. Use anos entre 2001 e 2026.',
        args,
      });
    });

    it('rejects malformed year values', () => {
      // Arrange
      const args = ['--from=vinte'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: '--from deve receber um ano no formato YYYY.',
        args,
      });
    });

    it('rejects reversed intervals', () => {
      // Arrange
      const args = ['--from=2025', '--to=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: '--from deve ser menor ou igual a --to.',
        args,
      });
    });
  });
});

function createFileSystem(
  overrides: Partial<jest.Mocked<CsvPlanItemFileSystem>> = {},
): jest.Mocked<CsvPlanItemFileSystem> {
  return {
    exists: jest.fn().mockResolvedValue(false),
    mkdir: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    write: jest.fn().mockResolvedValue(undefined),
    rename: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createTransport(
  body: AsyncIterable<Uint8Array>,
): jest.MockedFunction<CsvDownloadTransport> {
  return jest.fn().mockResolvedValue({
    ok: true,
    body,
  });
}

function csvBody(content: string): AsyncIterable<Uint8Array> {
  return Readable.from([Buffer.from(content)]);
}

async function drainBody(body: AsyncIterable<Uint8Array>): Promise<void> {
  for await (const chunk of body) {
    void chunk;
  }
}

async function sleepForTest(durationMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function* delayedCsvBody(
  content: string,
  delayMs: number,
): AsyncIterable<Uint8Array> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  yield Buffer.from(content);
}

async function* delayedCsvChunks(
  chunks: readonly (readonly [content: string, delayMs: number])[],
): AsyncIterable<Uint8Array> {
  for (const [content, delayMs] of chunks) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    yield Buffer.from(content);
  }
}
