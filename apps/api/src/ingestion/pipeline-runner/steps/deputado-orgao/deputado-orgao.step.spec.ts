import { createDeputadoOrgaoStep } from './deputado-orgao.step';
import type { CsvRow } from '../../sources/csv-reader';
import type {
  DeputadoOrgaoRepository,
  DeputadoOrgaoRow,
} from './deputado-orgao.repository.types';
import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';

async function* rows(items: readonly CsvRow[]): AsyncIterable<CsvRow> {
  for (const item of items) {
    yield item;
  }
}

const DEPUTADO_ID = 'deputado-uuid-204379';
const ORGAO_ID = 'orgao-uuid-2004';
const LEGISLATURA_56_ID = 'legislatura-uuid-56';
const LEGISLATURA_57_ID = 'legislatura-uuid-57';

type FakeRepository = DeputadoOrgaoRepository & {
  readonly replaced: { legislaturaId: string; rows: DeputadoOrgaoRow[] }[];
  readonly storeByLegislatura: Map<string, DeputadoOrgaoRow[]>;
};

function createFakeRepository(
  overrides: Partial<DeputadoOrgaoRepository> = {},
): FakeRepository {
  const replaced: { legislaturaId: string; rows: DeputadoOrgaoRow[] }[] = [];
  const storeByLegislatura = new Map<string, DeputadoOrgaoRow[]>();

  return {
    replaced,
    storeByLegislatura,
    async loadDeputadoIdByExternalId() {
      return new Map([[204379, DEPUTADO_ID]]);
    },
    async loadLegislaturaIdByExternalId() {
      return new Map([
        [56, LEGISLATURA_56_ID],
        [57, LEGISLATURA_57_ID],
      ]);
    },
    async loadOrgaoIdByExternalId() {
      return new Map([[2004, ORGAO_ID]]);
    },
    async replaceLegislatura(legislaturaId, incoming) {
      replaced.push({ legislaturaId, rows: [...incoming] });
      storeByLegislatura.set(legislaturaId, [...incoming]);
      return { inserted: incoming.length };
    },
    ...overrides,
  };
}

function vinculoRecord(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    uriOrgao: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/2004',
    siglaOrgao: 'CCJC',
    nomeOrgao: 'Comissão de Constituição e Justiça e de Cidadania',
    nomePublicacaoOrgao: 'Comissão de Constituição e Justiça e de Cidadania',
    uriDeputado: 'https://dadosabertos.camara.leg.br/api/v2/deputados/204379',
    nomeDeputado: 'Aécio Neves',
    siglaPartido: 'PSDB',
    siglaUF: 'MG',
    cargo: 'Titular',
    dataInicio: '2023-02-01',
    dataFim: '',
    ...overrides,
  };
}

function context(
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    debug: false,
    sourceFile: 'deputado_orgao',
    years: [2023],
    readRecords: () => rows([]),
    ...overrides,
  };
}

describe('deputado_orgao step', () => {
  describe('when the orgao table is empty', () => {
    it('does not calculate anything and preserves whatever is loaded', async () => {
      // Arrange
      const repository = createFakeRepository({
        loadOrgaoIdByExternalId: async () => new Map(),
      });
      const step = createDeputadoOrgaoStep(repository);

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 0, inserted: 0 });
      expect(repository.replaced).toEqual([]);
    });
  });

  describe('when a legislatura file has usable rows', () => {
    it('replaces only that legislatura scope', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoOrgaoStep(repository);
      const ctx = context({
        years: [2023],
        readLegislaturaDataset: (dataset, legislatura) => {
          if (dataset !== 'orgaosDeputados' || legislatura !== 57) {
            return undefined;
          }
          return () => rows([{ lineNumber: 2, record: vinculoRecord() }]);
        },
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 1, rejected: [] });
      expect(repository.replaced).toEqual([
        {
          legislaturaId: LEGISLATURA_57_ID,
          rows: [
            {
              deputadoId: DEPUTADO_ID,
              orgaoId: ORGAO_ID,
              legislaturaId: LEGISLATURA_57_ID,
              cargo: 'Titular',
              dataInicio: '2023-02-01',
              dataFim: null,
            },
          ],
        },
      ]);
    });
  });

  describe('when scanning two legislaturas', () => {
    it('does not touch the other legislatura scope', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoOrgaoStep(repository);
      const ctx = context({
        years: [2019, 2023],
        readLegislaturaDataset: (dataset, legislatura) => {
          if (dataset !== 'orgaosDeputados') return undefined;
          return () =>
            rows([
              {
                lineNumber: 2,
                record: vinculoRecord({
                  dataInicio: legislatura === 56 ? '2019-02-01' : '2023-02-01',
                }),
              },
            ]);
        },
      });

      // Act
      await step.run(ctx);

      // Assert
      const touchedLegislaturaIds = repository.replaced.map(
        (call) => call.legislaturaId,
      );
      expect(touchedLegislaturaIds).toEqual(
        expect.arrayContaining([LEGISLATURA_56_ID, LEGISLATURA_57_ID]),
      );
      expect(repository.replaced).toHaveLength(2);
    });
  });

  describe('when a row references an unknown orgao', () => {
    it('reports a single gap per unknown orgao and excludes the row', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoOrgaoStep(repository);
      const ctx = context({
        years: [2023],
        readLegislaturaDataset: () => () =>
          rows([
            {
              lineNumber: 2,
              record: vinculoRecord({
                uriOrgao:
                  'https://dadosabertos.camara.leg.br/api/v2/orgaos/9999',
              }),
            },
            {
              lineNumber: 3,
              record: vinculoRecord({
                uriOrgao:
                  'https://dadosabertos.camara.leg.br/api/v2/orgaos/9999',
              }),
            },
            { lineNumber: 4, record: vinculoRecord() },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result.externalGaps).toHaveLength(1);
      expect(result.externalGaps[0]).toMatchObject({
        type: 'orgao_desconhecido',
        reference: '9999',
      });
      expect(repository.replaced[0].rows).toHaveLength(1);
    });
  });

  describe('when a row references a deputado outside the ingested universe', () => {
    it('ignores the row instead of rejecting or gapping it', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoOrgaoStep(repository);
      const ctx = context({
        years: [2023],
        readLegislaturaDataset: () => () =>
          rows([
            {
              lineNumber: 2,
              record: vinculoRecord({
                uriDeputado:
                  'https://dadosabertos.camara.leg.br/api/v2/deputados/1',
              }),
            },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ ignored: 1, rejected: [] });
      expect(result.externalGaps).toEqual([
        expect.objectContaining({ type: 'fonte_vazia' }),
      ]);
    });
  });

  describe('when a row has an invalid uri or missing dataInicio', () => {
    it('rejects the row and reports the source location', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoOrgaoStep(repository);
      const ctx = context({
        years: [2023],
        readLegislaturaDataset: () => () =>
          rows([
            {
              lineNumber: 2,
              record: vinculoRecord({
                uriOrgao: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/',
              }),
            },
            {
              lineNumber: 3,
              record: vinculoRecord({ dataInicio: '' }),
            },
          ]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result.rejected).toHaveLength(2);
      expect(result.rejected[0]).toMatchObject({ line: 2 });
      expect(result.rejected[1]).toMatchObject({ line: 3 });
    });
  });

  describe('when a legislatura file is absent', () => {
    it('reports a gap and preserves whatever was loaded for that legislatura', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoOrgaoStep(repository);
      const ctx = context({
        years: [2023],
        readLegislaturaDataset: () => undefined,
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result.externalGaps).toEqual([
        expect.objectContaining({ type: 'fonte_ausente', reference: '57' }),
      ]);
      expect(repository.replaced).toEqual([]);
    });
  });

  describe('when a legislatura file has no usable row', () => {
    it('reports a fonte_vazia gap and preserves the previous load', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoOrgaoStep(repository);
      const ctx = context({
        years: [2023],
        readLegislaturaDataset: () => () =>
          rows([{ lineNumber: 2, record: vinculoRecord({ dataInicio: '' }) }]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result.externalGaps).toEqual([
        expect.objectContaining({ type: 'fonte_vazia', reference: '57' }),
      ]);
      expect(repository.replaced).toEqual([]);
    });
  });

  describe('when dataFim is blank', () => {
    it('persists it as null, meaning an open-ended vínculo', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoOrgaoStep(repository);
      const ctx = context({
        years: [2023],
        readLegislaturaDataset: () => () =>
          rows([{ lineNumber: 2, record: vinculoRecord({ dataFim: '' }) }]),
      });

      // Act
      await step.run(ctx);

      // Assert
      expect(repository.replaced[0].rows[0].dataFim).toBeNull();
    });
  });

  describe('when strict mode is enabled', () => {
    it('aborts at the first rejection without writing anything', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoOrgaoStep(repository);
      const ctx = context({
        strict: true,
        years: [2023],
        readLegislaturaDataset: () => () =>
          rows([
            {
              lineNumber: 2,
              record: vinculoRecord({ dataInicio: '' }),
            },
          ]),
      });

      // Act / Assert
      await expect(step.run(ctx)).rejects.toThrow();
      expect(repository.replaced).toEqual([]);
    });
  });

  describe('when running in dry-run mode', () => {
    it('discovers vínculos but never writes the repository', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoOrgaoStep(repository);
      const ctx = context({
        dryRun: true,
        years: [2023],
        readLegislaturaDataset: () => () =>
          rows([{ lineNumber: 2, record: vinculoRecord() }]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0 });
      expect(repository.replaced).toEqual([]);
    });
  });
});
