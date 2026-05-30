import type { Readable } from 'node:stream';

import { parse } from 'csv-parse';

export type CsvRecord = Record<string, string>;

export type CsvRow = {
  lineNumber: number;
  record: CsvRecord;
};

export type CsvReader = (source: Readable) => AsyncIterable<CsvRow>;

export async function* readCsvRecords(source: Readable): AsyncIterable<CsvRow> {
  const parser = source.pipe(
    parse({
      delimiter: ';',
      bom: true,
      columns: true,
      info: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }),
  );

  for await (const entry of parser as AsyncIterable<{
    record: CsvRecord;
    info: { lines: number };
  }>) {
    yield {
      lineNumber: entry.info.lines,
      record: entry.record,
    };
  }
}
