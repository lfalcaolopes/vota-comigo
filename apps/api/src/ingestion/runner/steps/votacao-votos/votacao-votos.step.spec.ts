import { createVotacaoVotosStep } from './votacao-votos.step';
import type { CsvRecord, CsvRow } from '../../csv-reader';
import type { IngestionStepContext } from '../../ingestion-runner.types';
import type { VotacaoLookup } from '../votacao-proposicao/votacao-proposicao.repository.types';
import type {
  DeputadoLookup,
  VotacaoVotosRepository,
  VotacaoVotosRow,
  VotacaoVotosUpsertResult,
} from './votacao-votos.repository.types';

async function* rows(items: readonly CsvRow[]): AsyncIterable<CsvRow> {
  for (const item of items) {
    yield item;
  }
}

function row(record: CsvRecord, lineNumber = 2): CsvRow {
  return { lineNumber, record };
}

function votoRecord(overrides: CsvRecord = {}): CsvRecord {
  return {
    idVotacao: '1197773-140',
    uriVotacao:
      'https://dadosabertos.camara.leg.br/api/v2/votacoes/1197773-140',
    dataHoraVoto: '2024-12-04T21:10:04',
    voto: 'Sim',
    deputado_uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/204379',
    deputado_nome: 'Acacio Favacho',
    deputado_siglaUf: 'AP',
    deputado_idLegislatura: '57',
    ...overrides,
  };
}

type FakeRepository = VotacaoVotosRepository & {
  readonly upserted: VotacaoVotosRow[][];
};

function createFakeRepository(): FakeRepository {
  const store = new Map<string, VotacaoVotosRow>();
  const upserted: VotacaoVotosRow[][] = [];

  return {
    upserted,
    async upsert(incoming): Promise<VotacaoVotosUpsertResult> {
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

function votacaoLookup(map: Record<string, string>): VotacaoLookup {
  return {
    async loadIdByExternalId() {
      return new Map(Object.entries(map));
    },
  };
}

function deputadoLookup(map: Record<number, string>): DeputadoLookup {
  return {
    async loadIdByExternalId() {
      return new Map(
        Object.entries(map).map(([key, value]) => [Number(key), value]),
      );
    },
  };
}

function context(
  items: readonly CsvRow[],
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    debug: false,
    sourceFile: 'votacoesVotos-2024.csv',
    readRecords: () => rows(items),
    ...overrides,
  };
}

describe('votacao_votos step', () => {
  describe('when importing individual votes from votacoesVotos', () => {
    it('persists one row per votacao with votes grouped by internal deputado id', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createVotacaoVotosStep({
        repository,
        votacaoLookup: votacaoLookup({ '1197773-140': 'votacao-uuid' }),
        deputadoLookup: deputadoLookup({
          204379: 'deputado-sim',
          204380: 'deputado-nao',
        }),
      });

      // Act
      const result = await step.run(
        context([
          row(votoRecord({ voto: 'Sim' })),
          row(
            votoRecord({
              voto: 'Não',
              deputado_uri:
                'https://dadosabertos.camara.leg.br/api/v2/deputados/204380',
            }),
            3,
          ),
        ]),
      );

      // Assert
      expect(result).toMatchObject({
        read: 1,
        inserted: 1,
        updated: 0,
        ignored: 0,
        rejected: [],
        externalGaps: [],
      });
      const upserted = repository.upserted.flat();
      expect(upserted).toHaveLength(1);
      expect(upserted[0]).toMatchObject({
        externalIdVotacao: '1197773-140',
        votacaoId: 'votacao-uuid',
        votosSim: 1,
        votosNao: 1,
      });
      expect(upserted[0]?.votosJson.sim).toEqual(['deputado-sim']);
      expect(upserted[0]?.votosJson.nao).toEqual(['deputado-nao']);
    });
  });

  describe('when running in dry-run mode', () => {
    it('aggregates and reports rows without writing the repository', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createVotacaoVotosStep({
        repository,
        votacaoLookup: votacaoLookup({ '1197773-140': 'votacao-uuid' }),
        deputadoLookup: deputadoLookup({ 204379: 'deputado-sim' }),
      });

      // Act
      const result = await step.run(
        context([row(votoRecord())], { dryRun: true }),
      );

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0, updated: 0 });
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when strict mode finds a rejected vote', () => {
    it('aborts before writing aggregated rows', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createVotacaoVotosStep({
        repository,
        votacaoLookup: votacaoLookup({ '1197773-140': 'votacao-uuid' }),
        deputadoLookup: deputadoLookup({}),
      });

      // Act / Assert
      await expect(
        step.run(context([row(votoRecord())], { strict: true })),
      ).rejects.toThrow('deputado_externo_desconhecido');
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when the same votacao votes are ingested twice', () => {
    it('updates the existing row on the second run instead of inserting another one', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createVotacaoVotosStep({
        repository,
        votacaoLookup: votacaoLookup({ '1197773-140': 'votacao-uuid' }),
        deputadoLookup: deputadoLookup({ 204379: 'deputado-sim' }),
      });
      const buildContext = () => context([row(votoRecord())]);

      // Act
      const first = await step.run(buildContext());
      const second = await step.run(buildContext());

      // Assert
      expect(first).toMatchObject({ inserted: 1, updated: 0 });
      expect(second).toMatchObject({ inserted: 0, updated: 1 });
      expect(repository.upserted).toHaveLength(2);
    });
  });
});
