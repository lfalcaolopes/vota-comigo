import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { zipSync, strToU8 } from 'fflate';

import { extractZipEntry } from '../adapters/zip-archive-extractor';

describe('extractZipEntry', () => {
  let workingDirectory: string;

  beforeEach(async () => {
    workingDirectory = await mkdtemp(join(tmpdir(), 'ceap-archive-'));
  });

  afterEach(async () => {
    await rm(workingDirectory, { recursive: true, force: true });
  });

  describe('when the archive holds the expected csv inside a folder', () => {
    it('writes that csv to the destination', async () => {
      // Arrange
      const csv = 'txNomeParlamentar;numAno\nFulano;2025\n';
      const archivePath = await writeArchive({
        'csv/Ano-2025.csv': csv,
      });
      const destinationPath = join(workingDirectory, 'Ano-2025.csv.tmp');

      // Act
      await extractZipEntry({
        archivePath,
        entryName: 'Ano-2025.csv',
        destinationPath,
      });

      // Assert
      await expect(readFile(destinationPath, 'utf8')).resolves.toBe(csv);
    });
  });

  describe('when the archive lacks the expected csv', () => {
    it('rejects naming the expected entry', async () => {
      // Arrange
      const archivePath = await writeArchive({
        'csv/Ano-2024.csv': 'numAno\n2024\n',
      });

      // Act
      const extraction = extractZipEntry({
        archivePath,
        entryName: 'Ano-2025.csv',
        destinationPath: join(workingDirectory, 'Ano-2025.csv.tmp'),
      });

      // Assert
      await expect(extraction).rejects.toThrow(
        'arquivo compactado não contém a entrada esperada Ano-2025.csv',
      );
    });
  });

  describe('when the downloaded file is not a valid archive', () => {
    it('rejects instead of writing a destination file', async () => {
      // Arrange
      const archivePath = join(workingDirectory, 'Ano-2025.csv.zip.tmp');
      await writeFile(archivePath, 'nao sou um zip');
      const destinationPath = join(workingDirectory, 'Ano-2025.csv.tmp');

      // Act
      const extraction = extractZipEntry({
        archivePath,
        entryName: 'Ano-2025.csv',
        destinationPath,
      });

      // Assert
      await expect(extraction).rejects.toThrow('arquivo compactado inválido');
      await expect(readFile(destinationPath, 'utf8')).rejects.toThrow('ENOENT');
    });
  });

  async function writeArchive(
    entries: Record<string, string>,
  ): Promise<string> {
    const archivePath = join(workingDirectory, 'Ano-2025.csv.zip.tmp');
    const content = zipSync(
      Object.fromEntries(
        Object.entries(entries).map(([name, value]) => [name, strToU8(value)]),
      ),
    );
    await writeFile(archivePath, content);

    return archivePath;
  }
});
