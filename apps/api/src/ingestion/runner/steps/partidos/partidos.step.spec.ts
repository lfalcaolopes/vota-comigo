import { createPartidosStep } from './partidos.step';
import type { CsvRow } from '../../csv-reader';
import type {
  PartidoRepository,
  PartidoRow,
  PartidoUpsertResult,
} from './partidos.repository.types';
import type { IngestionStepContext } from '../../ingestion-runner.types';

async function* rows(items: readonly CsvRow[]): AsyncIterable<CsvRow> {
  for (const item of items) {
    yield item;
  }
}

type FakeRepository = PartidoRepository & {
  readonly upserted: PartidoRow[][];
};

function createFakeRepository(): FakeRepository {
  const store = new Map<number, PartidoRow>();
  const upserted: PartidoRow[][] = [];

  return {
    upserted,
    async upsert(incoming): Promise<PartidoUpsertResult> {
      upserted.push([...incoming]);
      let inserted = 0;
      let updated = 0;

      for (const row of incoming) {
        if (store.has(row.externalIdPartido)) {
          updated += 1;
        } else {
          inserted += 1;
        }

        store.set(row.externalIdPartido, row);
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
    sourceFile: 'votacoesVotos-2024.csv',
    ...overrides,
  };
}

function voteRecord(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    idVotacao: '1197773-140',
    voto: 'Sim',
    deputado_uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/204379',
    deputado_siglaPartido: 'MDB',
    deputado_uriPartido:
      'https://dadosabertos.camara.leg.br/api/v2/partidos/36899',
    ...overrides,
  };
}

describe('partidos step', () => {
  describe('when votes reference different partidos', () => {
    it('discovers one partido per distinct uriPartido and upserts them', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createPartidosStep(repository);
      const ctx = context({
        readRecords: () =>
          rows([
            { lineNumber: 2, record: voteRecord() },
            {
              lineNumber: 3,
              record: voteRecord({
                deputado_siglaPartido: 'PT',
                deputado_uriPartido:
                  'https://dadosabertos.camara.leg.br/api/v2/partidos/36844',
              }),
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
        rejected: [],
      });
      expect(repository.upserted[0]).toEqual(
        expect.arrayContaining([
          {
            externalIdPartido: 36899,
            sigla: 'MDB',
            uri: 'https://dadosabertos.camara.leg.br/api/v2/partidos/36899',
          },
          {
            externalIdPartido: 36844,
            sigla: 'PT',
            uri: 'https://dadosabertos.camara.leg.br/api/v2/partidos/36844',
          },
        ]),
      );
    });
  });

  describe('when many votes reference the same partido', () => {
    it('deduplicates by external id and keeps the last observed sigla', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createPartidosStep(repository);
      const ctx = context({
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: voteRecord({ deputado_siglaPartido: 'PMDB' }),
            },
            {
              lineNumber: 3,
              record: voteRecord({ deputado_siglaPartido: 'MDB' }),
            },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 1 });
      expect(repository.upserted[0]).toEqual([
        {
          externalIdPartido: 36899,
          sigla: 'MDB',
          uri: 'https://dadosabertos.camara.leg.br/api/v2/partidos/36899',
        },
      ]);
    });
  });

  describe('when a vote has no partido', () => {
    it('does not contribute a partido for an empty uriPartido', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createPartidosStep(repository);
      const ctx = context({
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: voteRecord({
                deputado_siglaPartido: '',
                deputado_uriPartido: '',
              }),
            },
            { lineNumber: 3, record: voteRecord() },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 1, rejected: [] });
      expect(repository.upserted[0]).toEqual([
        expect.objectContaining({ externalIdPartido: 36899 }),
      ]);
    });
  });

  describe('when a vote has a malformed uriPartido', () => {
    it('rejects the observation and reports the source location', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createPartidosStep(repository);
      const ctx = context({
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: voteRecord({
                deputado_uriPartido:
                  'https://dadosabertos.camara.leg.br/api/v2/partidos/',
              }),
            },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({
        file: 'votacoesVotos-2024.csv',
        line: 2,
      });
      expect(repository.upserted[0] ?? []).toEqual([]);
    });
  });

  describe('when strict mode is enabled and a uriPartido is malformed', () => {
    it('aborts at the first rejection without writing anything', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createPartidosStep(repository);
      const ctx = context({
        strict: true,
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: voteRecord({
                deputado_uriPartido:
                  'https://dadosabertos.camara.leg.br/api/v2/partidos/',
              }),
            },
          ]),
      });

      // Act / Assert
      await expect(step.run(ctx)).rejects.toThrow();
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when running in dry-run mode', () => {
    it('discovers partidos but never writes the repository', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createPartidosStep(repository);
      const ctx = context({
        dryRun: true,
        readRecords: () => rows([{ lineNumber: 2, record: voteRecord() }]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0, updated: 0 });
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when the same partidos are ingested twice', () => {
    it('updates the existing rows on the second run instead of inserting duplicates', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createPartidosStep(repository);
      const readRecords = () => rows([{ lineNumber: 2, record: voteRecord() }]);

      // Act
      const first = await step.run(context({ readRecords }));
      const second = await step.run(context({ readRecords }));

      // Assert
      expect(first).toMatchObject({ inserted: 1, updated: 0 });
      expect(second).toMatchObject({ inserted: 0, updated: 1 });
    });
  });
});
