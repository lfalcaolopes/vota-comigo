import { Readable } from 'node:stream';

import { readCsvRecords } from './csv-reader';
import type { CsvRow } from './csv-reader';

async function collect(source: Readable): Promise<CsvRow[]> {
  const rows: CsvRow[] = [];

  for await (const row of readCsvRecords(source)) {
    rows.push(row);
  }

  return rows;
}

describe('csv reader', () => {
  describe('when parsing a semicolon-delimited file with a header', () => {
    it('yields one record per data line keyed by the header columns', async () => {
      // Arrange
      const csv = [
        'idLegislatura;uri',
        '57;https://example/57',
        '56;https://example/56',
      ].join('\n');

      // Act
      const rows = await collect(Readable.from(csv));

      // Assert
      expect(rows.map((row) => row.record)).toEqual([
        { idLegislatura: '57', uri: 'https://example/57' },
        { idLegislatura: '56', uri: 'https://example/56' },
      ]);
    });
  });

  describe('when the file starts with a UTF-8 BOM', () => {
    it('strips the BOM from the first header column and reports the source line number', async () => {
      // Arrange
      const csv = ['﻿idLegislatura;uri', '57;https://example/57'].join('\n');

      // Act
      const rows = await collect(Readable.from(csv));

      // Assert
      expect(rows).toEqual([
        {
          lineNumber: 2,
          record: { idLegislatura: '57', uri: 'https://example/57' },
        },
      ]);
    });
  });

  describe('when a field is quoted and contains the delimiter', () => {
    it('keeps the quoted value intact instead of splitting on the inner delimiter', async () => {
      // Arrange
      const csv = ['id;descricao', '"57";"Plenário; Câmara"'].join('\n');

      // Act
      const rows = await collect(Readable.from(csv));

      // Assert
      expect(rows[0].record).toEqual({
        id: '57',
        descricao: 'Plenário; Câmara',
      });
    });
  });

  describe('when a row has empty fields', () => {
    it('represents missing values as empty strings', async () => {
      // Arrange
      const csv = ['id;dataFim;anoEleicao', '57;;2022'].join('\n');

      // Act
      const rows = await collect(Readable.from(csv));

      // Assert
      expect(rows[0].record).toEqual({
        id: '57',
        dataFim: '',
        anoEleicao: '2022',
      });
    });
  });

  describe('when a row has fewer columns than the header', () => {
    it('surfaces the short row without aborting the rest of the file', async () => {
      // Arrange
      const csv = [
        'id;uri',
        '57;https://example/57',
        '56',
        '55;https://example/55',
      ].join('\n');

      // Act
      const rows = await collect(Readable.from(csv));

      // Assert
      expect(rows.map((row) => row.record.id)).toEqual(['57', '56', '55']);
      expect(rows[1].record.uri).toBeUndefined();
    });
  });
});
