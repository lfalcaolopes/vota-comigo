import { Readable } from 'node:stream';

import { downloadCsvPlanItem } from './csv-downloader';
import type {
  CsvDownloadPlanItem,
  CsvDownloadTransport,
  CsvPlanItemFileSystem,
} from './csv-downloader.types';

describe('downloadCsvPlanItem', () => {
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
