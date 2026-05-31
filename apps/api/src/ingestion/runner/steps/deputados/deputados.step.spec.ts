import { createDeputadosStep } from './deputados.step';
import type { CsvRow } from '../../csv-reader';
import type {
  DeputadoRepository,
  DeputadoRow,
  DeputadoUpsertResult,
  LegislaturaLookup,
} from './deputados.repository.types';
import type { IngestionStepContext } from '../../ingestion-runner.types';

async function* rows(items: readonly CsvRow[]): AsyncIterable<CsvRow> {
  for (const item of items) {
    yield item;
  }
}

type FakeRepository = DeputadoRepository & {
  readonly upserted: DeputadoRow[];
};

function createFakeRepository(): FakeRepository {
  const store = new Map<number, DeputadoRow>();
  const upserted: DeputadoRow[] = [];

  return {
    upserted,
    async upsert(incoming): Promise<DeputadoUpsertResult> {
      let inserted = 0;
      let updated = 0;

      for (const row of incoming) {
        upserted.push(row);

        if (store.has(row.externalIdDeputado)) {
          updated += 1;
        } else {
          inserted += 1;
        }

        store.set(row.externalIdDeputado, row);
      }

      return { inserted, updated };
    },
  };
}

function lookupOf(entries: ReadonlyMap<number, string>): LegislaturaLookup {
  return {
    loadIdByExternalId: () => Promise.resolve(entries),
  };
}

const throwingLookup: LegislaturaLookup = {
  loadIdByExternalId() {
    throw new Error('lookup should not be called');
  },
};

function context(
  overrides: Partial<IngestionStepContext> &
    Pick<IngestionStepContext, 'readRecords'>,
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    sourceFile: 'deputados.csv',
    ...overrides,
  };
}

function deputadoRecord(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/220593',
    nome: 'Abilio Brunini',
    idLegislaturaInicial: '57',
    idLegislaturaFinal: '57',
    nomeCivil: 'ABILIO JACQUES BRUNINI MOUMER',
    cpf: '',
    siglaSexo: 'M',
    urlRedeSocial: '',
    urlWebsite: '',
    dataNascimento: '1984-01-31',
    dataFalecimento: '',
    ufNascimento: 'MT',
    municipioNascimento: 'Cuiabá',
    ...overrides,
  };
}

describe('deputados step', () => {
  describe('when the file contains an in-scope deputado', () => {
    it('extracts the external id, resolves legislatura foreign keys, and upserts one row', async () => {
      // Arrange
      const repository = createFakeRepository();
      const lookup = lookupOf(new Map([[57, 'legislatura-uuid-57']]));
      const step = createDeputadosStep(repository, lookup);
      const ctx = context({
        readRecords: () => rows([{ lineNumber: 2, record: deputadoRecord() }]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({
        read: 1,
        inserted: 1,
        updated: 0,
        ignored: 0,
        rejected: [],
      });
      expect(repository.upserted).toEqual([
        {
          externalIdDeputado: 220593,
          uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/220593',
          nome: 'Abilio Brunini',
          nomeCivil: 'ABILIO JACQUES BRUNINI MOUMER',
          siglaSexo: 'M',
          dataNascimento: '1984-01-31',
          dataFalecimento: null,
          ufNascimento: 'MT',
          municipioNascimento: 'Cuiabá',
          urlRedeSocial: null,
          urlWebsite: null,
          legislaturaInicialId: 'legislatura-uuid-57',
          legislaturaFinalId: 'legislatura-uuid-57',
        },
      ]);
    });
  });

  describe('when a deputado is out of the legislatura scope', () => {
    it('ignores rows whose idLegislaturaFinal is below 51 without upserting them', async () => {
      // Arrange
      const repository = createFakeRepository();
      const lookup = lookupOf(new Map([[57, 'legislatura-uuid-57']]));
      const step = createDeputadosStep(repository, lookup);
      const ctx = context({
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: deputadoRecord({
                uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/74',
                idLegislaturaInicial: '48',
                idLegislaturaFinal: '50',
              }),
            },
            { lineNumber: 3, record: deputadoRecord() },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 2, inserted: 1, ignored: 1 });
      expect(repository.upserted).toEqual([
        expect.objectContaining({ externalIdDeputado: 220593 }),
      ]);
    });
  });

  describe('when a row has a uri without a numeric id', () => {
    it('rejects the bad row, keeps the valid one, and reports the source location', async () => {
      // Arrange
      const repository = createFakeRepository();
      const lookup = lookupOf(new Map([[57, 'legislatura-uuid-57']]));
      const step = createDeputadosStep(repository, lookup);
      const ctx = context({
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: deputadoRecord({
                uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/',
              }),
            },
            { lineNumber: 3, record: deputadoRecord() },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result.read).toBe(2);
      expect(result.inserted).toBe(1);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({
        file: 'deputados.csv',
        line: 2,
      });
      expect(repository.upserted).toEqual([
        expect.objectContaining({ externalIdDeputado: 220593 }),
      ]);
    });
  });

  describe('when a referenced legislatura is missing from the database', () => {
    it('rejects the deputado instead of writing a dangling foreign key', async () => {
      // Arrange
      const repository = createFakeRepository();
      const lookup = lookupOf(new Map());
      const step = createDeputadosStep(repository, lookup);
      const ctx = context({
        readRecords: () => rows([{ lineNumber: 2, record: deputadoRecord() }]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result.inserted).toBe(0);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({ line: 2 });
      expect(repository.upserted).toEqual([]);
    });

    it('rejects when only the initial legislatura is missing', async () => {
      // Arrange
      const repository = createFakeRepository();
      const lookup = lookupOf(new Map([[57, 'legislatura-uuid-57']]));
      const step = createDeputadosStep(repository, lookup);
      const ctx = context({
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: deputadoRecord({ idLegislaturaInicial: '52' }),
            },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result.inserted).toBe(0);
      expect(result.rejected[0]).toMatchObject({
        type: 'validacao_legislatura_ausente',
        fields: { idLegislatura: '52' },
      });
      expect(repository.upserted).toEqual([]);
    });

    it('aborts in strict mode when a referenced legislatura is missing', async () => {
      // Arrange
      const repository = createFakeRepository();
      const lookup = lookupOf(new Map());
      const step = createDeputadosStep(repository, lookup);
      const ctx = context({
        strict: true,
        readRecords: () => rows([{ lineNumber: 2, record: deputadoRecord() }]),
      });

      // Act / Assert
      await expect(step.run(ctx)).rejects.toThrow();
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when running in dry-run mode', () => {
    it('parses and filters but never reads the lookup or writes the repository', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadosStep(repository, throwingLookup);
      const ctx = context({
        dryRun: true,
        readRecords: () => rows([{ lineNumber: 2, record: deputadoRecord() }]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0, updated: 0 });
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when strict mode is enabled and a row is invalid', () => {
    it('aborts at the first rejection without writing anything', async () => {
      // Arrange
      const repository = createFakeRepository();
      const lookup = lookupOf(new Map([[57, 'legislatura-uuid-57']]));
      const step = createDeputadosStep(repository, lookup);
      const ctx = context({
        strict: true,
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: deputadoRecord({
                uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/',
              }),
            },
          ]),
      });

      // Act / Assert
      await expect(step.run(ctx)).rejects.toThrow();
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when the same deputados are ingested twice', () => {
    it('updates the existing rows on the second run instead of inserting duplicates', async () => {
      // Arrange
      const repository = createFakeRepository();
      const lookup = lookupOf(new Map([[57, 'legislatura-uuid-57']]));
      const step = createDeputadosStep(repository, lookup);
      const readRecords = () =>
        rows([{ lineNumber: 2, record: deputadoRecord() }]);

      // Act
      const first = await step.run(context({ readRecords }));
      const second = await step.run(context({ readRecords }));

      // Assert
      expect(first).toMatchObject({ inserted: 1, updated: 0 });
      expect(second).toMatchObject({ inserted: 0, updated: 1 });
    });
  });
});
