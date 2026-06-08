import { createVotacaoProposicaoStep } from './votacao-proposicao.step';
import type { CsvRecord, CsvRow } from '../../sources/csv-reader';
import type {
  ProposicaoLookup,
  VotacaoLookup,
  VotacaoProposicaoRepository,
  VotacaoProposicaoRow,
  VotacaoProposicaoUpsertResult,
} from './votacao-proposicao.repository.types';
import type {
  CsvRowSource,
  IngestionStepContext,
} from '../../types/ingestion-pipeline-runner.types';

async function* rows(items: readonly CsvRecord[]): AsyncIterable<CsvRow> {
  let lineNumber = 1;
  for (const record of items) {
    lineNumber += 1;
    yield { lineNumber, record };
  }
}

function source(items: readonly CsvRecord[]): CsvRowSource {
  return () => rows(items);
}

function link(
  idVotacao: string,
  proposicaoId: string,
  ano = '2024',
): CsvRecord {
  return { idVotacao, proposicao_id: proposicaoId, proposicao_ano: ano };
}

function createFakeRepository(): VotacaoProposicaoRepository & {
  readonly upserted: VotacaoProposicaoRow[][];
} {
  const store = new Set<string>();
  const upserted: VotacaoProposicaoRow[][] = [];
  return {
    upserted,
    async upsert(incoming): Promise<VotacaoProposicaoUpsertResult> {
      upserted.push([...incoming]);
      let inserted = 0;
      let updated = 0;
      for (const item of incoming) {
        const key = `${item.externalIdVotacao}:${item.externalIdProposicao}`;
        if (store.has(key)) {
          updated += 1;
        } else {
          inserted += 1;
        }
        store.add(key);
      }
      return { inserted, updated };
    },
  };
}

function votacaoLookup(map: Record<string, string>): VotacaoLookup {
  return {
    async loadIdByExternalId() {
      return new Map(Object.entries(map));
    },
  };
}

function proposicaoLookup(map: Record<number, string>): ProposicaoLookup {
  return {
    async loadIdByExternalId() {
      return new Map(
        Object.entries(map).map(([key, value]) => [Number(key), value]),
      );
    },
  };
}

type Datasets = Record<string, Record<number, readonly CsvRecord[]>>;

function context(
  datasets: Datasets,
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext & { readonly requested: string[] } {
  const requested: string[] = [];
  return {
    requested,
    dryRun: false,
    strict: false,
    debug: false,
    sourceFile: 'votacao_proposicao',
    years: [2024],
    readRecords: () => rows([]),
    readDataset: (dataset, year) => {
      requested.push(dataset);
      const records = datasets[dataset]?.[year];
      return records === undefined ? undefined : source(records);
    },
    ...overrides,
  };
}

describe('votacao_proposicao step', () => {
  describe('when building canonical links from votacoesProposicoes', () => {
    it('persists one link per affected proposicao resolving both foreign keys', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesProposicoes: {
          2024: [link('1006391-32', '1006391'), link('1006391-32', '700000')],
        },
      };
      const repository = createFakeRepository();
      const step = createVotacaoProposicaoStep({
        repository,
        votacaoLookup: votacaoLookup({ '1006391-32': 'votacao-uuid' }),
        proposicaoLookup: proposicaoLookup({
          1006391: 'prop-a',
          700000: 'prop-b',
        }),
      });

      // Act
      const result = await step.run(context(datasets));

      // Assert
      expect(result).toMatchObject({ read: 2, inserted: 2 });
      expect(repository.upserted.flat()).toEqual([
        {
          externalIdVotacao: '1006391-32',
          externalIdProposicao: 1006391,
          votacaoId: 'votacao-uuid',
          proposicaoId: 'prop-a',
        },
        {
          externalIdVotacao: '1006391-32',
          externalIdProposicao: 700000,
          votacaoId: 'votacao-uuid',
          proposicaoId: 'prop-b',
        },
      ]);
    });

    it('never reads votacoesObjetos as a source', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesProposicoes: { 2024: [link('1006391-32', '1006391')] },
      };
      const ctx = context(datasets);
      const step = createVotacaoProposicaoStep({
        repository: createFakeRepository(),
        votacaoLookup: votacaoLookup({ '1006391-32': 'votacao-uuid' }),
        proposicaoLookup: proposicaoLookup({ 1006391: 'prop-a' }),
      });

      // Act
      await step.run(ctx);

      // Assert
      expect(ctx.requested).not.toContain('votacoesObjetos');
    });
  });

  describe('when the affected proposicao was not ingested', () => {
    it('keeps the link with a null proposicao foreign key', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesProposicoes: { 2024: [link('1006391-32', '700000')] },
      };
      const repository = createFakeRepository();
      const step = createVotacaoProposicaoStep({
        repository,
        votacaoLookup: votacaoLookup({ '1006391-32': 'votacao-uuid' }),
        proposicaoLookup: proposicaoLookup({}),
      });

      // Act
      await step.run(context(datasets));

      // Assert
      expect(repository.upserted.flat()).toEqual([
        {
          externalIdVotacao: '1006391-32',
          externalIdProposicao: 700000,
          votacaoId: 'votacao-uuid',
          proposicaoId: null,
        },
      ]);
    });
  });

  describe('when a link points to a votacao that was not ingested', () => {
    it('ignores the link instead of writing an orphan', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesProposicoes: { 2024: [link('9999-9', '1006391')] },
      };
      const repository = createFakeRepository();
      const step = createVotacaoProposicaoStep({
        repository,
        votacaoLookup: votacaoLookup({ '1006391-32': 'votacao-uuid' }),
        proposicaoLookup: proposicaoLookup({ 1006391: 'prop-a' }),
      });

      // Act
      const result = await step.run(context(datasets));

      // Assert
      expect(result).toMatchObject({ read: 0, ignored: 1 });
      expect(repository.upserted.flat()).toEqual([]);
    });
  });

  describe('when running in dry-run mode', () => {
    it('resolves and counts links but never writes', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesProposicoes: { 2024: [link('1006391-32', '1006391')] },
      };
      const repository = createFakeRepository();
      const step = createVotacaoProposicaoStep({
        repository,
        votacaoLookup: votacaoLookup({ '1006391-32': 'votacao-uuid' }),
        proposicaoLookup: proposicaoLookup({ 1006391: 'prop-a' }),
      });

      // Act
      const result = await step.run(context(datasets, { dryRun: true }));

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0, updated: 0 });
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when the votacoesProposicoes file is missing for a year', () => {
    it('reports a source gap in default mode and aborts in strict mode', async () => {
      // Arrange
      const repository = createFakeRepository();
      const build = (strict: boolean) =>
        createVotacaoProposicaoStep({
          repository,
          votacaoLookup: votacaoLookup({}),
          proposicaoLookup: proposicaoLookup({}),
        }).run(context({}, { strict }));

      // Act
      const result = await build(false);

      // Assert
      expect(result.externalGaps).toEqual([
        expect.objectContaining({ type: 'fonte_ausente' }),
      ]);
      await expect(build(true)).rejects.toThrow();
    });
  });
});
