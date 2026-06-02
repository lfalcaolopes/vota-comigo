import { createVotacoesStep } from './votacoes.step';
import type { CsvRecord, CsvRow } from '../../csv-reader';
import type {
  VotacaoRepository,
  VotacaoRow,
  VotacaoUpsertResult,
} from './votacoes.repository.types';
import type { IngestionStepContext } from '../../ingestion-runner.types';

async function* rows(items: readonly CsvRow[]): AsyncIterable<CsvRow> {
  for (const item of items) {
    yield item;
  }
}

function row(record: CsvRecord, lineNumber = 2): CsvRow {
  return { lineNumber, record };
}

type FakeRepository = VotacaoRepository & {
  readonly upserted: VotacaoRow[][];
};

function createFakeRepository(): FakeRepository {
  const store = new Map<string, VotacaoRow>();
  const upserted: VotacaoRow[][] = [];

  return {
    upserted,
    async upsert(incoming): Promise<VotacaoUpsertResult> {
      upserted.push([...incoming]);
      let inserted = 0;
      let updated = 0;

      for (const item of incoming) {
        if (store.has(item.externalIdVotacao)) {
          updated += 1;
        } else {
          inserted += 1;
        }
        store.set(item.externalIdVotacao, item);
      }

      return { inserted, updated };
    },
  };
}

function votacaoRecord(overrides: CsvRecord = {}): CsvRecord {
  return {
    id: '2236343-24',
    uri: 'https://dadosabertos.camara.leg.br/api/v2/votacoes/2236343-24',
    data: '2020-02-04',
    dataHoraRegistro: '2020-02-04T19:39:25',
    idOrgao: '180',
    siglaOrgao: 'PLEN',
    idEvento: '60500',
    aprovacao: '1',
    votosSim: '300',
    votosNao: '120',
    votosOutros: '3',
    descricao: 'Aprovado requerimento de urgencia.',
    ultimaAberturaVotacao_dataHoraRegistro: '2020-02-04T19:30:00',
    ultimaAberturaVotacao_descricao: 'Abertura da votacao.',
    ultimaApresentacaoProposicao_dataHoraRegistro: '2020-02-04T18:00:00',
    ultimaApresentacaoProposicao_descricao: 'Apresentacao do PL 23/2020.',
    ultimaApresentacaoProposicao_idProposicao: '2235643',
    ultimaApresentacaoProposicao_uriProposicao:
      'https://dadosabertos.camara.leg.br/api/v2/proposicoes/2235643',
    ...overrides,
  };
}

function voteRecord(idVotacao: string): CsvRecord {
  return {
    idVotacao,
    voto: 'Sim',
    deputado_uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/204379',
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
    sourceFile: 'votacoes-2020.csv',
    ...overrides,
  };
}

describe('votacoes step', () => {
  describe('when filtering by the nominal vote index', () => {
    it('imports only votacoes whose id appears in votacoesVotos and ignores the rest', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createVotacoesStep(repository);
      const ctx = context({
        readRecords: () =>
          rows([
            row(votacaoRecord({ id: '2236343-24' })),
            row(votacaoRecord({ id: '9999999-99' }), 3),
          ]),
        readCompanion: () => () => rows([row(voteRecord('2236343-24'))]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({
        read: 1,
        inserted: 1,
        updated: 0,
        ignored: 1,
        rejected: [],
        externalGaps: [],
      });
      expect(repository.upserted[0]).toEqual([
        expect.objectContaining({
          externalIdVotacao: '2236343-24',
          escopoVotacao: 'plenario',
          votosSim: 300,
          descricao: 'Aprovado requerimento de urgencia.',
        }),
      ]);
    });
  });

  describe('when running in dry-run mode', () => {
    it('reads and counts nominal votacoes but never writes the repository', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createVotacoesStep(repository);
      const ctx = context({
        dryRun: true,
        readRecords: () => rows([row(votacaoRecord({ id: '2236343-24' }))]),
        readCompanion: () => () => rows([row(voteRecord('2236343-24'))]),
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0, updated: 0 });
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when the same votacoes are ingested twice', () => {
    it('updates the existing rows on the second run instead of inserting duplicates', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createVotacoesStep(repository);
      const build = () =>
        context({
          readRecords: () => rows([row(votacaoRecord({ id: '2236343-24' }))]),
          readCompanion: () => () => rows([row(voteRecord('2236343-24'))]),
        });

      // Act
      const first = await step.run(build());
      const second = await step.run(build());

      // Assert
      expect(first).toMatchObject({ inserted: 1, updated: 0 });
      expect(second).toMatchObject({ inserted: 0, updated: 1 });
    });
  });

  describe('when the nominal vote index is absent', () => {
    it('reports a source gap and ignores every votacao without writing', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createVotacoesStep(repository);
      const ctx = context({
        readRecords: () =>
          rows([
            row(votacaoRecord({ id: '2236343-24' })),
            row(votacaoRecord({ id: '9999999-99' }), 3),
          ]),
        readCompanion: () => undefined,
      });

      // Act
      const result = await step.run(ctx);

      // Assert
      expect(result).toMatchObject({ read: 0, inserted: 0, ignored: 2 });
      expect(result.externalGaps).toEqual([
        expect.objectContaining({ type: 'fonte_ausente' }),
      ]);
      expect(repository.upserted.flat()).toEqual([]);
    });

    it('aborts in strict mode when the nominal vote index is absent', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createVotacoesStep(repository);
      const ctx = context({
        strict: true,
        readRecords: () => rows([row(votacaoRecord({ id: '2236343-24' }))]),
        readCompanion: () => undefined,
      });

      // Act / Assert
      await expect(step.run(ctx)).rejects.toThrow();
      expect(repository.upserted.flat()).toEqual([]);
    });
  });
});
