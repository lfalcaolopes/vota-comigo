import { createOrgaosStep } from './orgaos.step';
import type { CsvRow } from '../../sources/csv-reader';
import type {
  OrgaoRepository,
  OrgaoRow,
  OrgaoUpsertResult,
} from './orgaos.repository.types';
import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';

async function* rows(items: readonly CsvRow[]): AsyncIterable<CsvRow> {
  for (const item of items) {
    yield item;
  }
}

type FakeRepository = OrgaoRepository & {
  readonly upserted: OrgaoRow[][];
};

function createFakeRepository(): FakeRepository {
  const store = new Map<number, OrgaoRow>();
  const upserted: OrgaoRow[][] = [];

  return {
    upserted,
    async upsert(incoming): Promise<OrgaoUpsertResult> {
      upserted.push([...incoming]);
      let inserted = 0;
      let updated = 0;

      for (const row of incoming) {
        if (store.has(row.externalIdOrgao)) {
          updated += 1;
        } else {
          inserted += 1;
        }

        store.set(row.externalIdOrgao, row);
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
    debug: false,
    sourceFile: 'orgaos.csv',
    ...overrides,
  };
}

function orgaoRecord(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    uri: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/2004',
    sigla: 'CCJC',
    apelido: '',
    nome: 'Comissão de Constituição e Justiça e de Cidadania',
    nomePublicacao: 'COMISSÃO DE CONSTITUIÇÃO E JUSTIÇA E DE CIDADANIA',
    codTipoOrgao: '2',
    tipoOrgao: 'Comissão Permanente',
    casa: 'camara',
    ...overrides,
  };
}

describe('orgaos step', () => {
  describe('when records reference different orgaos', () => {
    it('discovers one orgao per distinct uri and upserts them', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createOrgaosStep(repository);
      const ctx = context({
        readRecords: () =>
          rows([
            { lineNumber: 2, record: orgaoRecord() },
            {
              lineNumber: 3,
              record: orgaoRecord({
                uri: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/180',
                sigla: 'PLEN',
              }),
            },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 2, inserted: 2, rejected: [] });
    });
  });

  describe('when many rows reference the same orgao', () => {
    it('deduplicates by external id and keeps the last observed values', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createOrgaosStep(repository);
      const ctx = context({
        readRecords: () =>
          rows([
            { lineNumber: 2, record: orgaoRecord({ sigla: 'STALE' }) },
            { lineNumber: 3, record: orgaoRecord({ sigla: 'CCJC' }) },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 1 });
      expect(repository.upserted[0]).toEqual([
        expect.objectContaining({ externalIdOrgao: 2004, sigla: 'CCJC' }),
      ]);
    });
  });

  describe('when a row has a malformed uri', () => {
    it('rejects the observation and deduplicates repeated invalid uris', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createOrgaosStep(repository);
      const ctx = context({
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: orgaoRecord({
                uri: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/',
              }),
            },
            {
              lineNumber: 3,
              record: orgaoRecord({
                uri: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/',
              }),
            },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({ file: 'orgaos.csv', line: 2 });
      expect(repository.upserted[0] ?? []).toEqual([]);
    });
  });

  describe('when strict mode is enabled and a uri is malformed', () => {
    it('aborts at the first rejection without writing anything', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createOrgaosStep(repository);
      const ctx = context({
        strict: true,
        readRecords: () =>
          rows([
            {
              lineNumber: 2,
              record: orgaoRecord({
                uri: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/',
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
    it('discovers orgaos but never writes the repository', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createOrgaosStep(repository);
      const ctx = context({
        dryRun: true,
        readRecords: () => rows([{ lineNumber: 2, record: orgaoRecord() }]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0, updated: 0 });
      expect(repository.upserted).toEqual([]);
    });
  });
});
