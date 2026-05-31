import { createLegislaturasStep } from './legislaturas.step';
import type { CsvRow } from '../../csv-reader';
import type {
  LegislaturaRepository,
  LegislaturaRow,
  LegislaturaUpsertResult,
} from './legislaturas.repository.types';
import type { IngestionStepContext } from '../../ingestion-runner.types';

async function* rows(items: readonly CsvRow[]): AsyncIterable<CsvRow> {
  for (const item of items) {
    yield item;
  }
}

type FakeRepository = LegislaturaRepository & {
  readonly upserted: LegislaturaRow[];
};

function createFakeRepository(): FakeRepository {
  const store = new Map<number, LegislaturaRow>();
  const upserted: LegislaturaRow[] = [];

  return {
    upserted,
    async upsert(incoming): Promise<LegislaturaUpsertResult> {
      let inserted = 0;
      let updated = 0;

      for (const row of incoming) {
        upserted.push(row);

        if (store.has(row.externalIdLegislatura)) {
          updated += 1;
        } else {
          inserted += 1;
        }

        store.set(row.externalIdLegislatura, row);
      }

      return { inserted, updated };
    },
  };
}

function context(
  overrides: Partial<IngestionStepContext> &
    Pick<IngestionStepContext, 'readRecords'>,
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    sourceFile: 'legislaturas.csv',
    ...overrides,
  };
}

describe('legislaturas step', () => {
  describe('when the file contains valid legislaturas', () => {
    it('maps the source fields and upserts one row per legislatura', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createLegislaturasStep(repository);
      const ctx = context({
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: {
                idLegislatura: '57',
                uri: 'https://example/57',
                dataInicio: '2023-02-01',
                dataFim: '2027-01-31',
                anoEleicao: '2022',
              },
            },
            {
              lineNumber: 3,
              record: {
                idLegislatura: '56',
                uri: 'https://example/56',
                dataInicio: '2019-02-01',
                dataFim: '2023-01-31',
                anoEleicao: '2018',
              },
            },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({
        read: 2,
        inserted: 2,
        updated: 0,
        ignored: 0,
        rejected: [],
      });
      expect(repository.upserted).toEqual([
        {
          externalIdLegislatura: 57,
          uri: 'https://example/57',
          dataInicio: '2023-02-01',
          dataFim: '2027-01-31',
          anoEleicao: 2022,
        },
        {
          externalIdLegislatura: 56,
          uri: 'https://example/56',
          dataInicio: '2019-02-01',
          dataFim: '2023-01-31',
          anoEleicao: 2018,
        },
      ]);
    });
  });

  describe('when running in dry-run mode', () => {
    it('parses and validates but never writes to the repository', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createLegislaturasStep(repository);
      const ctx = context({
        dryRun: true,
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: {
                idLegislatura: '57',
                uri: 'https://example/57',
                dataInicio: '2023-02-01',
                dataFim: '2027-01-31',
                anoEleicao: '2022',
              },
            },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0, updated: 0 });
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when a row has a non-numeric external id', () => {
    it('rejects the bad row, keeps the valid one, and reports the source location', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createLegislaturasStep(repository);
      const ctx = context({
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: { idLegislatura: 'abc', uri: 'https://example/x' },
            },
            {
              lineNumber: 3,
              record: { idLegislatura: '57', uri: 'https://example/57' },
            },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result.read).toBe(2);
      expect(result.inserted).toBe(1);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({
        file: 'legislaturas.csv',
        line: 2,
      });
      expect(repository.upserted).toEqual([
        expect.objectContaining({ externalIdLegislatura: 57 }),
      ]);
    });
  });

  describe('when strict mode is enabled and a row is invalid', () => {
    it('aborts at the first rejection without writing anything', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createLegislaturasStep(repository);
      const ctx = context({
        strict: true,
        readRecords: () =>
          rows([{ lineNumber: 2, record: { idLegislatura: 'abc' } }]),
      });

      // Act / Assert
      await expect(step.run(ctx)).rejects.toThrow();
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when the same legislaturas are ingested twice', () => {
    it('updates the existing rows on the second run instead of inserting duplicates', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createLegislaturasStep(repository);
      const readRecords = () =>
        rows([
          {
            lineNumber: 2,
            record: { idLegislatura: '57', uri: 'https://example/57' },
          },
        ]);

      // Act
      const first = await step.run(context({ readRecords }));
      const second = await step.run(context({ readRecords }));

      // Assert
      expect(first).toMatchObject({ inserted: 1, updated: 0 });
      expect(second).toMatchObject({ inserted: 0, updated: 1 });
    });
  });
});
