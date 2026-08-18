import { createReadStream, createWriteStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { Unzip, UnzipInflate } from 'fflate';

import type { CsvArchiveExtractor } from '../types/csv-downloader.types';

export const extractZipEntry: CsvArchiveExtractor = async ({
  archivePath,
  entryName,
  destinationPath,
}) => {
  let extraction: Promise<void> | undefined;

  const unzip = new Unzip((entry) => {
    // O ZIP da cota guarda o CSV sob um diretório interno, então a comparação
    // é pelo nome do arquivo, não pelo caminho completo.
    if (basename(entry.name) !== entryName) {
      return;
    }

    const content = new PassThrough();

    entry.ondata = (error, chunk, final) => {
      if (error) {
        content.destroy(error);
        return;
      }

      content.write(chunk);

      if (final) {
        content.end();
      }
    };

    extraction = pipeline(content, createWriteStream(destinationPath));
    entry.start();
  });

  unzip.register(UnzipInflate);

  try {
    let firstChunk = true;

    for await (const chunk of createReadStream(archivePath)) {
      const bytes = chunk as Uint8Array;

      if (firstChunk) {
        assertZipSignature(bytes);
        firstChunk = false;
      }

      unzip.push(bytes, false);
    }

    unzip.push(new Uint8Array(0), true);
  } catch (error) {
    throw new Error(
      `arquivo compactado inválido: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (extraction === undefined) {
    throw new Error(
      `arquivo compactado não contém a entrada esperada ${entryName}`,
    );
  }

  await extraction;
  await assertReadableCsv(destinationPath, entryName);
};

function assertZipSignature(bytes: Uint8Array): void {
  const isZip =
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06);

  if (!isZip) {
    throw new Error('assinatura zip ausente');
  }
}

async function assertReadableCsv(path: string, entryName: string) {
  const stats = await stat(path);

  if (stats.size === 0) {
    throw new Error(`${entryName} extraído está vazio`);
  }

  const file = await open(path, 'r');
  await file.close();
}
