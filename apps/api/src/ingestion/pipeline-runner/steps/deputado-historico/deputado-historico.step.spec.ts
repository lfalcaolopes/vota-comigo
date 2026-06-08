import { createDeputadoHistoricoStep } from './deputado-historico.step';
import type {
  DeputadoHistoricoClient,
  DeputadoHistoricoFetchResult,
  DeputadoHistoricoRepository,
  DeputadoHistoricoRow,
  DeputadoHistoricoUpsertResult,
  DeputadoSource,
  HistoricoEvento,
  IngestedDeputado,
  PartidoLookup,
} from './deputado-historico.repository.types';
import type {
  PartidoRepository,
  PartidoRow,
  PartidoUpsertResult,
} from '../partidos/partidos.repository.types';
import type { LegislaturaLookup } from '../deputados/deputados.repository.types';
import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';

function historicoKey(row: DeputadoHistoricoRow): string {
  return `${row.deputadoId}|${row.dataHora}|${row.descricaoStatus}`;
}

type FakeHistoricoRepository = DeputadoHistoricoRepository & {
  readonly upserted: DeputadoHistoricoRow[];
};

function createFakeHistoricoRepository(): FakeHistoricoRepository {
  const store = new Set<string>();
  const upserted: DeputadoHistoricoRow[] = [];

  return {
    upserted,
    async upsert(rows): Promise<DeputadoHistoricoUpsertResult> {
      let inserted = 0;
      let updated = 0;

      for (const row of rows) {
        upserted.push(row);
        const key = historicoKey(row);

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

type FakePartidoRepository = PartidoRepository & {
  readonly upserted: PartidoRow[];
};

function createFakePartidoRepository(): FakePartidoRepository {
  const store = new Set<number>();
  const upserted: PartidoRow[] = [];

  return {
    upserted,
    async upsert(rows): Promise<PartidoUpsertResult> {
      let inserted = 0;
      let updated = 0;

      for (const row of rows) {
        upserted.push(row);

        if (store.has(row.externalIdPartido)) {
          updated += 1;
        } else {
          inserted += 1;
        }

        store.add(row.externalIdPartido);
      }

      return { inserted, updated };
    },
  };
}

function legislaturaLookupOf(
  entries: ReadonlyMap<number, string>,
): LegislaturaLookup {
  return { loadIdByExternalId: () => Promise.resolve(entries) };
}

function partidoLookupOf(entries: ReadonlyMap<number, string>): PartidoLookup {
  return { loadIdByExternalId: () => Promise.resolve(entries) };
}

type PartidoBackend = {
  repository: FakePartidoRepository;
  lookup: PartidoLookup;
};

function partidoBackend(
  initial: ReadonlyMap<number, string> = new Map(),
): PartidoBackend {
  const ids = new Map(initial);
  const upserted: PartidoRow[] = [];

  return {
    repository: {
      upserted,
      async upsert(rows): Promise<PartidoUpsertResult> {
        let inserted = 0;
        let updated = 0;

        for (const row of rows) {
          upserted.push(row);

          if (ids.has(row.externalIdPartido)) {
            updated += 1;
          } else {
            inserted += 1;
            ids.set(row.externalIdPartido, `partido-${row.externalIdPartido}`);
          }
        }

        return { inserted, updated };
      },
    },
    lookup: { loadIdByExternalId: () => Promise.resolve(new Map(ids)) },
  };
}

function sourceOf(deputados: readonly IngestedDeputado[]): DeputadoSource {
  return { loadIngested: () => Promise.resolve(deputados) };
}

function clientOf(
  responses: ReadonlyMap<number, DeputadoHistoricoFetchResult>,
): DeputadoHistoricoClient {
  return {
    fetch(externalIdDeputado): Promise<DeputadoHistoricoFetchResult> {
      const response = responses.get(externalIdDeputado);

      if (response === undefined) {
        return Promise.resolve({ ok: true, eventos: [] });
      }

      return Promise.resolve(response);
    },
  };
}

function context(
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    debug: false,
    sourceFile: 'deputado_historico',
    readRecords() {
      throw new Error('api step should not read csv records');
    },
    ...overrides,
  };
}

function historicoEvento(
  overrides: Partial<HistoricoEvento> = {},
): HistoricoEvento {
  return {
    dataHora: '2023-02-01T15:00',
    situacao: 'Exercício',
    condicaoEleitoral: 'Titular',
    descricaoStatus: 'Entrada - Posse de Eleito Titular',
    siglaPartido: 'PT',
    uriPartido: 'https://dadosabertos.camara.leg.br/api/v2/partidos/13',
    idLegislatura: 57,
    nome: 'Fulano de Tal',
    nomeEleitoral: 'FULANO',
    siglaUf: 'SP',
    email: 'fulano@camara.leg.br',
    urlFoto: 'https://www.camara.leg.br/internet/deputado/bandep/220593.jpg',
    ...overrides,
  };
}

type StepDepsOverrides = {
  deputadoSource?: DeputadoSource;
  historicoClient?: DeputadoHistoricoClient;
  legislaturaLookup?: LegislaturaLookup;
  partidoLookup?: PartidoLookup;
  partidoRepository?: PartidoRepository;
  chunkSize?: number;
};

function stepWith(overrides: StepDepsOverrides = {}) {
  const historicoRepository = createFakeHistoricoRepository();
  const partidoRepository =
    overrides.partidoRepository ?? createFakePartidoRepository();

  const step = createDeputadoHistoricoStep({
    deputadoSource: overrides.deputadoSource ?? sourceOf([]),
    historicoClient: overrides.historicoClient ?? clientOf(new Map()),
    legislaturaLookup:
      overrides.legislaturaLookup ?? legislaturaLookupOf(new Map()),
    partidoLookup: overrides.partidoLookup ?? partidoLookupOf(new Map()),
    partidoRepository,
    historicoRepository,
    chunkSize: overrides.chunkSize,
  });

  return { step, historicoRepository, partidoRepository };
}

describe('deputado_historico step', () => {
  describe('when an ingested deputado has a single in-scope event', () => {
    it('fetches the history, resolves foreign keys, and upserts one event row', async () => {
      // Arrange
      const { step, historicoRepository } = stepWith({
        deputadoSource: sourceOf([{ id: 'dep-1', externalIdDeputado: 220593 }]),
        historicoClient: clientOf(
          new Map([[220593, { ok: true, eventos: [historicoEvento()] }]]),
        ),
        legislaturaLookup: legislaturaLookupOf(new Map([[57, 'leg-57']])),
        partidoLookup: partidoLookupOf(new Map([[13, 'partido-13']])),
      });

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({
        read: 1,
        inserted: 1,
        updated: 0,
        ignored: 0,
        rejected: [],
        externalGaps: [],
      });
      expect(historicoRepository.upserted).toEqual([
        {
          deputadoId: 'dep-1',
          legislaturaId: 'leg-57',
          partidoId: 'partido-13',
          dataHora: '2023-02-01T15:00',
          situacao: 'Exercício',
          condicaoEleitoral: 'Titular',
          descricaoStatus: 'Entrada - Posse de Eleito Titular',
          nome: 'Fulano de Tal',
          nomeEleitoral: 'FULANO',
          siglaUf: 'SP',
          email: 'fulano@camara.leg.br',
          urlFoto:
            'https://www.camara.leg.br/internet/deputado/bandep/220593.jpg',
        },
      ]);
    });
  });

  describe('when an event is an administrative marker with null situacao', () => {
    it('persists the event as raw data keeping situacao and condicaoEleitoral null', async () => {
      // Arrange
      const { step, historicoRepository } = stepWith({
        deputadoSource: sourceOf([{ id: 'dep-1', externalIdDeputado: 220593 }]),
        historicoClient: clientOf(
          new Map([
            [
              220593,
              {
                ok: true,
                eventos: [
                  historicoEvento({
                    situacao: null,
                    condicaoEleitoral: null,
                    descricaoStatus:
                      'Nome no início da legislatura / Partido no início da legislatura',
                  }),
                ],
              },
            ],
          ]),
        ),
        legislaturaLookup: legislaturaLookupOf(new Map([[57, 'leg-57']])),
        partidoLookup: partidoLookupOf(new Map([[13, 'partido-13']])),
      });

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 1, rejected: [] });
      expect(historicoRepository.upserted[0]).toMatchObject({
        situacao: null,
        condicaoEleitoral: null,
        descricaoStatus:
          'Nome no início da legislatura / Partido no início da legislatura',
      });
    });
  });

  describe('when the history references a partido unknown to the database', () => {
    it('creates the partido and resolves the event foreign key to it', async () => {
      // Arrange
      const partido = partidoBackend(new Map());
      const { step, historicoRepository } = stepWith({
        deputadoSource: sourceOf([{ id: 'dep-1', externalIdDeputado: 220593 }]),
        historicoClient: clientOf(
          new Map([
            [
              220593,
              {
                ok: true,
                eventos: [
                  historicoEvento({
                    siglaPartido: 'NOVO',
                    uriPartido:
                      'https://dadosabertos.camara.leg.br/api/v2/partidos/36',
                  }),
                ],
              },
            ],
          ]),
        ),
        legislaturaLookup: legislaturaLookupOf(new Map([[57, 'leg-57']])),
        partidoLookup: partido.lookup,
        partidoRepository: partido.repository,
      });

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 1, rejected: [] });
      expect(partido.repository.upserted).toEqual([
        {
          externalIdPartido: 36,
          sigla: 'NOVO',
          uri: 'https://dadosabertos.camara.leg.br/api/v2/partidos/36',
        },
      ]);
      expect(historicoRepository.upserted[0]).toMatchObject({
        partidoId: 'partido-36',
      });
    });
  });

  describe('when the run is interrupted partway through', () => {
    it('keeps the events of deputados already processed in earlier chunks', async () => {
      // Arrange
      const { step, historicoRepository } = stepWith({
        chunkSize: 1,
        deputadoSource: sourceOf([
          { id: 'dep-1', externalIdDeputado: 220593 },
          { id: 'dep-2', externalIdDeputado: 999999 },
        ]),
        historicoClient: clientOf(
          new Map<number, DeputadoHistoricoFetchResult>([
            [220593, { ok: true, eventos: [historicoEvento()] }],
            [999999, { ok: false, reason: '503 Service Unavailable' }],
          ]),
        ),
        legislaturaLookup: legislaturaLookupOf(new Map([[57, 'leg-57']])),
        partidoLookup: partidoLookupOf(new Map([[13, 'partido-13']])),
      });

      // Act / Assert
      await expect(step.run(context({ strict: true }))).rejects.toThrow();
      expect(historicoRepository.upserted).toHaveLength(1);
      expect(historicoRepository.upserted[0]).toMatchObject({
        deputadoId: 'dep-1',
        descricaoStatus: 'Entrada - Posse de Eleito Titular',
      });
    });
  });

  describe('when the API fails for one deputado', () => {
    it('records an external gap and keeps importing the other deputados', async () => {
      // Arrange
      const { step, historicoRepository } = stepWith({
        deputadoSource: sourceOf([
          { id: 'dep-1', externalIdDeputado: 220593 },
          { id: 'dep-2', externalIdDeputado: 999999 },
        ]),
        historicoClient: clientOf(
          new Map<number, DeputadoHistoricoFetchResult>([
            [220593, { ok: true, eventos: [historicoEvento()] }],
            [999999, { ok: false, reason: '503 Service Unavailable' }],
          ]),
        ),
        legislaturaLookup: legislaturaLookupOf(new Map([[57, 'leg-57']])),
        partidoLookup: partidoLookupOf(new Map([[13, 'partido-13']])),
      });

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 1 });
      expect(result.externalGaps).toHaveLength(1);
      expect(result.externalGaps[0]).toMatchObject({
        type: 'fonte_externa_indisponivel',
        reference: '999999',
      });
      expect(historicoRepository.upserted).toHaveLength(1);
    });

    it('aborts on the first external gap in strict mode without writing anything', async () => {
      // Arrange
      const { step, historicoRepository } = stepWith({
        deputadoSource: sourceOf([{ id: 'dep-2', externalIdDeputado: 999999 }]),
        historicoClient: clientOf(
          new Map<number, DeputadoHistoricoFetchResult>([
            [999999, { ok: false, reason: '503 Service Unavailable' }],
          ]),
        ),
      });

      // Act / Assert
      await expect(step.run(context({ strict: true }))).rejects.toThrow();
      expect(historicoRepository.upserted).toEqual([]);
    });
  });

  describe('when a reporter is provided', () => {
    it('logs progress as the deputados are fetched and a final 100% line', async () => {
      // Arrange
      const deputados = Array.from({ length: 250 }, (_, index) => ({
        id: `dep-${index}`,
        externalIdDeputado: index,
      }));
      const { step } = stepWith({ deputadoSource: sourceOf(deputados) });
      const logged: string[] = [];
      const reporter = { log: (message: string) => logged.push(message) };

      // Act
      await step.run(context({ reporter }));

      // Assert
      expect(logged).toContain('[deputado_historico] 100/250 deputados (40%)');
      expect(logged).toContain('[deputado_historico] 200/250 deputados (80%)');
      expect(logged).toContain('[deputado_historico] 250/250 deputados (100%)');
    });
  });

  describe('when a limit is set', () => {
    it('fetches only the first N deputados and ignores the rest', async () => {
      // Arrange
      const fetched: number[] = [];
      const countingClient: DeputadoHistoricoClient = {
        fetch(externalIdDeputado): Promise<DeputadoHistoricoFetchResult> {
          fetched.push(externalIdDeputado);
          return Promise.resolve({ ok: true, eventos: [] });
        },
      };
      const deputados = Array.from({ length: 5 }, (_, index) => ({
        id: `dep-${index}`,
        externalIdDeputado: index,
      }));
      const { step } = stepWith({
        deputadoSource: sourceOf(deputados),
        historicoClient: countingClient,
      });

      // Act
      await step.run(context({ limit: 2 }));

      // Assert
      expect(fetched.sort((a, b) => a - b)).toEqual([0, 1]);
    });
  });

  describe('when a window leaves deputados still pending', () => {
    it('reports how many pending deputados remain after the window', async () => {
      // Arrange
      const deputados = Array.from({ length: 5 }, (_, index) => ({
        id: `dep-${index}`,
        externalIdDeputado: index,
      }));
      const { step } = stepWith({ deputadoSource: sourceOf(deputados) });
      const logged: string[] = [];
      const reporter = { log: (message: string) => logged.push(message) };

      // Act
      await step.run(context({ limit: 2, reporter }));

      // Assert
      expect(logged).toContainEqual(
        expect.stringContaining(
          '2 processados nesta janela, 3 ainda pendentes',
        ),
      );
    });
  });

  describe('when debug mode is on', () => {
    it('emits a per-deputado event feed and a live status line', async () => {
      // Arrange
      const debugged: string[] = [];
      const statuses: string[] = [];
      const reporter = {
        log: () => undefined,
        debug: (message: string) => debugged.push(message),
        status: (message: string) => statuses.push(message),
      };
      const { step } = stepWith({
        deputadoSource: sourceOf([
          { id: 'dep-1', externalIdDeputado: 220593 },
          { id: 'dep-2', externalIdDeputado: 999999 },
        ]),
        historicoClient: clientOf(
          new Map<number, DeputadoHistoricoFetchResult>([
            [220593, { ok: true, eventos: [historicoEvento()] }],
            [999999, { ok: false, reason: '503 Service Unavailable' }],
          ]),
        ),
        legislaturaLookup: legislaturaLookupOf(new Map([[57, 'leg-57']])),
        partidoLookup: partidoLookupOf(new Map([[13, 'partido-13']])),
      });

      // Act
      await step.run(context({ debug: true, reporter }));

      // Assert
      expect(debugged).toContainEqual(
        expect.stringContaining('deputado 220593: ok, 1 eventos'),
      );
      expect(debugged).toContainEqual(
        expect.stringContaining(
          'deputado 999999: falhou (503 Service Unavailable)',
        ),
      );
      expect(debugged).toContainEqual(
        expect.stringContaining('gravando 1 eventos no banco'),
      );
      expect(statuses.at(-1)).toBe(
        'deputado_historico 2/2 (100%) ok:1 falhas:1',
      );
    });

    it('stays silent on the debug and status channels when debug is off', async () => {
      // Arrange
      const debugged: string[] = [];
      const statuses: string[] = [];
      const reporter = {
        log: () => undefined,
        debug: (message: string) => debugged.push(message),
        status: (message: string) => statuses.push(message),
      };
      const { step } = stepWith({
        deputadoSource: sourceOf([{ id: 'dep-1', externalIdDeputado: 220593 }]),
      });

      // Act
      await step.run(context({ debug: false, reporter }));

      // Assert
      expect(debugged).toEqual([]);
      expect(statuses).toEqual([]);
    });
  });

  describe('when running in dry-run mode', () => {
    it('short-circuits without calling the API, lookups or repositories', async () => {
      // Arrange
      const fail = (name: string) => () => {
        throw new Error(`${name} should not be called in dry-run`);
      };
      const step = createDeputadoHistoricoStep({
        deputadoSource: { loadIngested: fail('deputadoSource') },
        historicoClient: { fetch: fail('historicoClient') },
        legislaturaLookup: { loadIdByExternalId: fail('legislaturaLookup') },
        partidoLookup: { loadIdByExternalId: fail('partidoLookup') },
        partidoRepository: { upsert: fail('partidoRepository') },
        historicoRepository: { upsert: fail('historicoRepository') },
      });

      // Act
      const result = await step.run(context({ dryRun: true }));

      // Assert
      expect(result).toEqual({
        read: 0,
        inserted: 0,
        updated: 0,
        ignored: 0,
        rejected: [],
        externalGaps: [],
      });
    });
  });

  describe('when the same history is ingested twice', () => {
    it('updates the existing events on the second run instead of duplicating them', async () => {
      // Arrange
      const historicoRepository = createFakeHistoricoRepository();
      const deps = {
        deputadoSource: sourceOf([{ id: 'dep-1', externalIdDeputado: 220593 }]),
        historicoClient: clientOf(
          new Map([[220593, { ok: true, eventos: [historicoEvento()] }]]),
        ),
        legislaturaLookup: legislaturaLookupOf(new Map([[57, 'leg-57']])),
        partidoLookup: partidoLookupOf(new Map([[13, 'partido-13']])),
        partidoRepository: createFakePartidoRepository(),
        historicoRepository,
      };

      // Act
      const first = await createDeputadoHistoricoStep(deps).run(context());
      const second = await createDeputadoHistoricoStep(deps).run(context());

      // Assert
      expect(first).toMatchObject({ inserted: 1, updated: 0 });
      expect(second).toMatchObject({ inserted: 0, updated: 1 });
    });
  });

  describe('when an event references an unresolvable foreign key', () => {
    it('rejects an event whose uriPartido has no numeric id, keeping the valid one', async () => {
      // Arrange
      const { step, historicoRepository } = stepWith({
        deputadoSource: sourceOf([{ id: 'dep-1', externalIdDeputado: 220593 }]),
        historicoClient: clientOf(
          new Map([
            [
              220593,
              {
                ok: true,
                eventos: [
                  historicoEvento({
                    uriPartido:
                      'https://dadosabertos.camara.leg.br/api/v2/partidos/',
                  }),
                  historicoEvento({ dataHora: '2024-02-01T15:00' }),
                ],
              },
            ],
          ]),
        ),
        legislaturaLookup: legislaturaLookupOf(new Map([[57, 'leg-57']])),
        partidoLookup: partidoLookupOf(new Map([[13, 'partido-13']])),
      });

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ inserted: 1 });
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({
        type: 'validacao_uri_partido_invalida',
      });
      expect(historicoRepository.upserted).toHaveLength(1);
      expect(historicoRepository.upserted[0]).toMatchObject({
        dataHora: '2024-02-01T15:00',
      });
    });

    it('rejects an event whose legislatura is missing from the database', async () => {
      // Arrange
      const { step, historicoRepository } = stepWith({
        deputadoSource: sourceOf([{ id: 'dep-1', externalIdDeputado: 220593 }]),
        historicoClient: clientOf(
          new Map([
            [
              220593,
              { ok: true, eventos: [historicoEvento({ idLegislatura: 99 })] },
            ],
          ]),
        ),
        legislaturaLookup: legislaturaLookupOf(new Map([[57, 'leg-57']])),
        partidoLookup: partidoLookupOf(new Map([[13, 'partido-13']])),
      });

      // Act
      const result = await step.run(context());

      // Assert
      expect(result.inserted).toBe(0);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({
        type: 'validacao_legislatura_ausente',
        fields: { idLegislatura: '99' },
      });
      expect(historicoRepository.upserted).toEqual([]);
    });

    it('aborts in strict mode on the first invalid event', async () => {
      // Arrange
      const { step, historicoRepository } = stepWith({
        deputadoSource: sourceOf([{ id: 'dep-1', externalIdDeputado: 220593 }]),
        historicoClient: clientOf(
          new Map([
            [
              220593,
              { ok: true, eventos: [historicoEvento({ idLegislatura: 99 })] },
            ],
          ]),
        ),
        legislaturaLookup: legislaturaLookupOf(new Map([[57, 'leg-57']])),
        partidoLookup: partidoLookupOf(new Map([[13, 'partido-13']])),
      });

      // Act / Assert
      await expect(step.run(context({ strict: true }))).rejects.toThrow();
      expect(historicoRepository.upserted).toEqual([]);
    });
  });
});
