import { Readable } from 'node:stream';

import { downloadCsvPlanItem } from '../download/download-csv-plan-item';
import type {
  CsvArchiveExtractor,
  CsvDownloadPlanItem,
  CsvDownloadTransport,
  CsvPlanItemFileSystem,
} from '../types/csv-downloader.types';

describe('downloadCsvPlanItem for a compressed dataset', () => {
  const item: CsvDownloadPlanItem = {
    dataset: 'ceap',
    filename: 'Ano-2025.csv',
    url: 'https://www.camara.leg.br/cotas/Ano-2025.csv.zip',
    localPath: 'data/raw/ceap/Ano-2025.csv',
    archive: { entryName: 'Ano-2025.csv' },
  };

  describe('when the archive is downloaded and extracted', () => {
    it('promotes the destination only after extracting the expected entry', async () => {
      // Arrange
      const fileSystem = createFileSystem();
      const order: string[] = [];
      fileSystem.rename.mockImplementation(async () => {
        order.push('rename');
      });
      const extractArchive: jest.MockedFunction<CsvArchiveExtractor> = jest
        .fn()
        .mockImplementation(async () => {
          order.push('extract');
        });

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        transport: createTransport(archiveBody()),
        extractArchive,
      });

      // Assert
      expect(result).toEqual({
        status: 'downloaded',
        item,
        message: 'Ano-2025.csv baixado com sucesso.',
      });
      expect(fileSystem.write.mock.calls).toContainEqual([
        'data/raw/ceap/Ano-2025.csv.zip.tmp',
        expect.anything(),
      ]);
      expect(extractArchive).toHaveBeenCalledWith({
        archivePath: 'data/raw/ceap/Ano-2025.csv.zip.tmp',
        entryName: 'Ano-2025.csv',
        destinationPath: 'data/raw/ceap/Ano-2025.csv.tmp',
      });
      expect(fileSystem.rename.mock.calls).toEqual([
        ['data/raw/ceap/Ano-2025.csv.tmp', 'data/raw/ceap/Ano-2025.csv'],
      ]);
      expect(order).toEqual(['extract', 'rename']);
    });
  });

  describe('when the archive fails validation or extraction', () => {
    it('reports the failure and leaves no file behind', async () => {
      // Arrange
      const removedAfterExtraction: string[] = [];
      let extractionAttempted = false;
      const fileSystem = createFileSystem();
      fileSystem.remove.mockImplementation(async (path: string) => {
        if (extractionAttempted) {
          removedAfterExtraction.push(path);
        }
      });
      const extractArchive: jest.MockedFunction<CsvArchiveExtractor> = jest
        .fn()
        .mockImplementation(() => {
          extractionAttempted = true;

          return Promise.reject(
            new Error(
              'arquivo compactado não contém a entrada esperada Ano-2025.csv',
            ),
          );
        });

      // Act
      const result = await downloadCsvPlanItem(item, {
        fileSystem,
        transport: createTransport(archiveBody()),
        extractArchive,
      });

      // Assert
      expect(result).toMatchObject({
        status: 'failed',
        item,
        message:
          'Ano-2025.csv: arquivo compactado não contém a entrada esperada Ano-2025.csv',
      });
      expect(fileSystem.rename.mock.calls).toHaveLength(0);
      expect(removedAfterExtraction.sort()).toEqual([
        'data/raw/ceap/Ano-2025.csv.tmp',
        'data/raw/ceap/Ano-2025.csv.zip.tmp',
      ]);
    });
  });

  describe('when the dataset is not compressed', () => {
    it('writes the csv straight to the destination without extraction', async () => {
      // Arrange
      const plainItem: CsvDownloadPlanItem = {
        dataset: 'votacoes',
        filename: 'votacoes-2025.csv',
        url: 'https://example.test/arquivos/votacoes/csv/votacoes-2025.csv',
        localPath: 'data/raw/votacoes/votacoes-2025.csv',
      };
      const fileSystem = createFileSystem();
      const extractArchive: jest.MockedFunction<CsvArchiveExtractor> =
        jest.fn();

      // Act
      const result = await downloadCsvPlanItem(plainItem, {
        fileSystem,
        transport: createTransport(archiveBody()),
        extractArchive,
      });

      // Assert
      expect(result.status).toBe('downloaded');
      expect(extractArchive).not.toHaveBeenCalled();
      expect(fileSystem.write.mock.calls).toEqual([
        ['data/raw/votacoes/votacoes-2025.csv.tmp', expect.anything()],
      ]);
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

function archiveBody(): AsyncIterable<Uint8Array> {
  return Readable.from([Buffer.from('PK conteudo compactado')]);
}
