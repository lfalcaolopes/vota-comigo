import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';
import { createDeputadoGastoCotaSigepaStep } from './deputado-gasto-cota-sigepa.step';
import { DESCRICAO_PASSAGEM_AEREA_SIGEPA } from './gasto-sigepa';
import type { LegislaturaPeriodo } from './legislaturas-do-ano';
import type {
  AnoRepostoRegistro,
  CoberturaAno,
  DeputadoDespesasClient,
  DeputadoDespesasFetchResult,
  DeputadoDespesasQuery,
  DeputadoGastoCotaSigepaRepository,
  DeputadoSemReposicao,
  DespesaCota,
  GastoCotaSigepaRow,
} from './deputado-gasto-cota-sigepa.repository.types';

const LEGISLATURAS: LegislaturaPeriodo[] = [
  {
    externalIdLegislatura: 56,
    dataInicio: '2019-02-01',
    dataFim: '2023-01-31',
  },
  {
    externalIdLegislatura: 57,
    dataInicio: '2023-02-01',
    dataFim: '2027-01-31',
  },
];

function intervalo(
  openedAt: string,
  closedAt: string | null = null,
): IntervaloExercicio {
  return { openedAt, closedAt };
}

function deputado(
  overrides: Partial<DeputadoSemReposicao> = {},
): DeputadoSemReposicao {
  return {
    deputadoId: 'dep-1',
    externalIdDeputado: 220593,
    intervalos: [intervalo('2023-02-01T12:00:00Z')],
    ...overrides,
  };
}

function despesa(overrides: Partial<DespesaCota> = {}): DespesaCota {
  return {
    ano: 2025,
    mes: 3,
    tipoDespesa: DESCRICAO_PASSAGEM_AEREA_SIGEPA,
    valorLiquido: 1234.56,
    ...overrides,
  };
}

type FakeRepository = DeputadoGastoCotaSigepaRepository & {
  readonly upserted: GastoCotaSigepaRow[];
  readonly completude: AnoRepostoRegistro[];
};

type RepositoryOverrides = {
  legislaturas?: readonly LegislaturaPeriodo[];
  cobertura?: CoberturaAno | null;
  reposicaoGravada?: readonly string[];
};

function repositoryOf(
  deputados: readonly DeputadoSemReposicao[],
  overrides: RepositoryOverrides = {},
): FakeRepository {
  const legislaturas = overrides.legislaturas ?? LEGISLATURAS;
  const cobertura =
    overrides.cobertura === undefined
      ? { coveredThroughMonth: 7, sigepaReposto: false }
      : overrides.cobertura;
  const stored = new Set<string>(
    (overrides.reposicaoGravada ?? []).map(
      (deputadoId) => `${deputadoId}|2025`,
    ),
  );
  const upserted: GastoCotaSigepaRow[] = [];
  const completude: AnoRepostoRegistro[] = [];

  return {
    upserted,
    completude,
    loadDeputadosSemReposicao: (year) =>
      Promise.resolve(
        deputados.filter(
          (candidato) => !stored.has(`${candidato.deputadoId}|${year}`),
        ),
      ),
    loadDeputadosElegiveis: () => Promise.resolve(deputados),
    loadLegislaturas: () => Promise.resolve(legislaturas),
    loadCobertura: () => Promise.resolve(cobertura),
    saveAnoReposto(registro) {
      completude.push(registro);

      return Promise.resolve();
    },
    upsert(rows) {
      let inserted = 0;
      let updated = 0;

      for (const row of rows) {
        upserted.push(row);
        const key = `${row.deputadoId}|${row.year}`;

        if (stored.has(key)) {
          updated += 1;
        } else {
          inserted += 1;
        }

        stored.add(key);
      }

      return Promise.resolve({ inserted, updated });
    },
  };
}

type ClientCall = DeputadoDespesasQuery;

type FakeClient = DeputadoDespesasClient & {
  readonly calls: ClientCall[];
};

function clientOf(
  responses: ReadonlyMap<number, DeputadoDespesasFetchResult>,
): FakeClient {
  const calls: ClientCall[] = [];

  return {
    calls,
    fetch(query) {
      calls.push(query);

      return Promise.resolve(
        responses.get(query.externalIdDeputado) ?? { ok: true, despesas: [] },
      );
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
    year: 2025,
    sourceFile: 'deputado_gasto_cota_sigepa',
    readRecords() {
      throw new Error('api step should not read csv records');
    },
    ...overrides,
  };
}

type StepOverrides = {
  repository?: FakeRepository;
  despesasClient?: DeputadoDespesasClient;
  chunkSize?: number;
  refetch?: boolean;
};

function stepWith(overrides: StepOverrides = {}) {
  const repository = overrides.repository ?? repositoryOf([]);
  const despesasClient = overrides.despesasClient ?? clientOf(new Map());
  const step = createDeputadoGastoCotaSigepaStep({
    repository,
    despesasClient,
    chunkSize: overrides.chunkSize,
    refetch: overrides.refetch,
  });

  return { step, repository, despesasClient };
}

describe('deputado_gasto_cota_sigepa step', () => {
  describe('when a deputado has passagem aerea expenses in the year', () => {
    it('persists the monthly total in centavos for that deputado-ano', async () => {
      // Arrange
      const { step, repository } = stepWith({
        repository: repositoryOf([deputado()]),
        despesasClient: clientOf(
          new Map<number, DeputadoDespesasFetchResult>([
            [
              220593,
              {
                ok: true,
                despesas: [
                  despesa({ mes: 3, valorLiquido: 1000 }),
                  despesa({ mes: 3, valorLiquido: 234.56 }),
                  despesa({ mes: 4, valorLiquido: -50 }),
                ],
              },
            ],
          ]),
        ),
      });

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 3, inserted: 1, updated: 0 });
      expect(repository.upserted).toEqual([
        {
          deputadoId: 'dep-1',
          year: 2025,
          gastosJson: { '3': 123456, '4': -5000 },
        },
      ]);
    });
  });

  describe('when the eligible set is derived', () => {
    it('takes the deputados from the exercicio intervalos of the year, not from the dump', async () => {
      // Arrange
      const { step, despesasClient } = stepWith({
        repository: repositoryOf([
          deputado({ deputadoId: 'dep-1', externalIdDeputado: 220593 }),
          deputado({
            deputadoId: 'dep-2',
            externalIdDeputado: 111111,
            intervalos: [
              intervalo('2019-02-01T12:00:00Z', '2023-01-31T00:00:00Z'),
            ],
          }),
        ]),
      });

      // Act
      await step.run(context());

      // Assert
      expect(
        (despesasClient as FakeClient).calls.map(
          (call) => call.externalIdDeputado,
        ),
      ).toEqual([220593]);
    });

    it('queries every legislatura the deputado exercised in the year', async () => {
      // Arrange
      const { step, despesasClient } = stepWith({
        repository: repositoryOf([
          deputado({
            intervalos: [intervalo('2022-05-01T00:00:00Z')],
          }),
        ]),
      });

      // Act
      await step.run(context({ year: 2023 }));

      // Assert
      expect((despesasClient as FakeClient).calls).toEqual([
        {
          externalIdDeputado: 220593,
          year: 2023,
          externalIdLegislaturaList: [56, 57],
        },
      ]);
    });
  });

  describe('when a deputado did not fly in the year', () => {
    it('records an empty gastos row and drops the deputado from the pending set', async () => {
      // Arrange
      const repository = repositoryOf([deputado()]);
      const { step, despesasClient } = stepWith({ repository });

      // Act
      const first = await step.run(context());
      const second = await step.run(context());

      // Assert
      expect(repository.upserted).toEqual([
        { deputadoId: 'dep-1', year: 2025, gastosJson: {} },
      ]);
      expect(first).toMatchObject({ inserted: 1 });
      expect(second).toMatchObject({ inserted: 0, read: 0 });
      expect((despesasClient as FakeClient).calls).toHaveLength(1);
    });
  });

  describe('when the run is interrupted partway through', () => {
    it('keeps the deputados already written in earlier batches', async () => {
      // Arrange
      const repository = repositoryOf([
        deputado({ deputadoId: 'dep-1', externalIdDeputado: 220593 }),
        deputado({ deputadoId: 'dep-2', externalIdDeputado: 111111 }),
      ]);
      const { step } = stepWith({
        chunkSize: 1,
        repository,
        despesasClient: clientOf(
          new Map<number, DeputadoDespesasFetchResult>([
            [220593, { ok: true, despesas: [despesa()] }],
            [111111, { ok: false, reason: '503 Service Unavailable' }],
          ]),
        ),
      });

      // Act / Assert
      await expect(step.run(context({ strict: true }))).rejects.toThrow();
      expect(repository.upserted).toEqual([
        {
          deputadoId: 'dep-1',
          year: 2025,
          gastosJson: { '3': 123456 },
        },
      ]);
    });
  });

  describe('when the API keeps failing for one deputado', () => {
    it('records an external gap and leaves that deputado pending', async () => {
      // Arrange
      const repository = repositoryOf([
        deputado({ deputadoId: 'dep-1', externalIdDeputado: 220593 }),
        deputado({ deputadoId: 'dep-2', externalIdDeputado: 111111 }),
      ]);
      const { step } = stepWith({
        repository,
        despesasClient: clientOf(
          new Map<number, DeputadoDespesasFetchResult>([
            [111111, { ok: false, reason: '503 Service Unavailable' }],
          ]),
        ),
      });

      // Act
      const result = await step.run(context());

      // Assert
      expect(result.externalGaps).toHaveLength(1);
      expect(result.externalGaps[0]).toMatchObject({
        file: 'deputado_gasto_cota_sigepa',
        type: 'fonte_externa_indisponivel',
        reference: '111111',
      });
      expect(result.externalGaps[0].message).toContain('em 2025');
      expect(repository.upserted.map((row) => row.deputadoId)).toEqual([
        'dep-1',
      ]);
    });
  });

  describe('when the API reports a different description for the category', () => {
    it('aborts the year instead of persisting a partial reposicao', async () => {
      // Arrange
      const repository = repositoryOf([deputado()]);
      const { step } = stepWith({
        repository,
        despesasClient: clientOf(
          new Map<number, DeputadoDespesasFetchResult>([
            [
              220593,
              {
                ok: true,
                despesas: [despesa({ tipoDespesa: 'PASSAGENS SIGEPA' })],
              },
            ],
          ]),
        ),
      });

      // Act / Assert
      await expect(step.run(context())).rejects.toThrow();
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when a despesa carries an unusable field', () => {
    it('rejects the despesa and still closes the deputado-ano', async () => {
      // Arrange
      const repository = repositoryOf([deputado()]);
      const { step } = stepWith({
        repository,
        despesasClient: clientOf(
          new Map<number, DeputadoDespesasFetchResult>([
            [
              220593,
              {
                ok: true,
                despesas: [despesa({ mes: 13 }), despesa({ mes: 5 })],
              },
            ],
          ]),
        ),
      });

      // Act
      const result = await step.run(context());

      // Assert
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({ type: 'mes_invalido' });
      expect(repository.upserted).toEqual([
        { deputadoId: 'dep-1', year: 2025, gastosJson: { '5': 123456 } },
      ]);
    });
  });

  describe('when a limit is set', () => {
    it('processes only the first N pending deputados of the session', async () => {
      // Arrange
      const repository = repositoryOf(
        Array.from({ length: 5 }, (_, index) =>
          deputado({
            deputadoId: `dep-${index}`,
            externalIdDeputado: 200000 + index,
          }),
        ),
      );
      const { step, despesasClient } = stepWith({ repository });

      // Act
      await step.run(context({ limit: 2 }));

      // Assert
      expect(
        (despesasClient as FakeClient).calls.map(
          (call) => call.externalIdDeputado,
        ),
      ).toEqual([200000, 200001]);
      expect(repository.upserted).toHaveLength(2);
    });
  });

  describe('when a window leaves deputados still pending', () => {
    it('reports how many pending deputados remain after the window', async () => {
      // Arrange
      const repository = repositoryOf(
        Array.from({ length: 5 }, (_, index) =>
          deputado({
            deputadoId: `dep-${index}`,
            externalIdDeputado: 200000 + index,
          }),
        ),
      );
      const { step } = stepWith({ repository });
      const logged: string[] = [];

      // Act
      await step.run(
        context({ limit: 2, reporter: { log: (line) => logged.push(line) } }),
      );

      // Assert
      expect(logged).toContainEqual(
        expect.stringContaining(
          '[deputado_gasto_cota_sigepa 2025] 2 processados nesta janela, 3 ainda pendentes',
        ),
      );
    });
  });

  describe('when running in dry-run mode', () => {
    it('short-circuits without calling the API or the repository', async () => {
      // Arrange
      const fail = (name: string) => () => {
        throw new Error(`${name} should not be called in dry-run`);
      };
      const step = createDeputadoGastoCotaSigepaStep({
        repository: {
          loadDeputadosSemReposicao: fail('loadDeputadosSemReposicao'),
          loadDeputadosElegiveis: fail('loadDeputadosElegiveis'),
          loadLegislaturas: fail('loadLegislaturas'),
          loadCobertura: fail('loadCobertura'),
          saveAnoReposto: fail('saveAnoReposto'),
          upsert: fail('upsert'),
        },
        despesasClient: { fetch: fail('despesasClient') },
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

  describe('when the API returns expenses of other categories', () => {
    it('ignores them instead of aggregating them into the reposicao', async () => {
      // Arrange
      const repository = repositoryOf([deputado()]);
      const { step } = stepWith({
        repository,
        despesasClient: clientOf(
          new Map<number, DeputadoDespesasFetchResult>([
            [
              220593,
              {
                ok: true,
                despesas: [
                  despesa({ tipoDespesa: 'COMBUSTÍVEIS E LUBRIFICANTES.' }),
                  despesa({ mes: 6, valorLiquido: 100 }),
                ],
              },
            ],
          ]),
        ),
      });

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 2, ignored: 1 });
      expect(repository.upserted).toEqual([
        { deputadoId: 'dep-1', year: 2025, gastosJson: { '6': 10000 } },
      ]);
    });
  });

  describe('when the run closes every eligible deputado of the year', () => {
    it('registers the year as reposto against the dump coverage month it was apurado on', async () => {
      // Arrange
      const repository = repositoryOf(
        [
          deputado({ deputadoId: 'dep-1', externalIdDeputado: 220593 }),
          deputado({ deputadoId: 'dep-2', externalIdDeputado: 111111 }),
        ],
        { cobertura: { coveredThroughMonth: 7, sigepaReposto: false } },
      );
      const { step } = stepWith({ repository });

      // Act
      await step.run(context());

      // Assert
      expect(repository.completude).toEqual([
        { year: 2025, reposto: true, coveredThroughMonth: 7 },
      ]);
    });

    it('announces the registered year', async () => {
      // Arrange
      const { step } = stepWith({ repository: repositoryOf([deputado()]) });
      const logged: string[] = [];

      // Act
      await step.run(
        context({ reporter: { log: (line) => logged.push(line) } }),
      );

      // Assert
      expect(logged).toContainEqual(
        expect.stringContaining(
          '[deputado_gasto_cota_sigepa 2025] ano reposto: todos os elegíveis cobertos, apurado com o dump até o mês 7',
        ),
      );
    });
  });

  describe('when any eligible deputado is still pending after the run', () => {
    it('does not register the year as reposto', async () => {
      // Arrange
      const repository = repositoryOf([
        deputado({ deputadoId: 'dep-1', externalIdDeputado: 220593 }),
        deputado({ deputadoId: 'dep-2', externalIdDeputado: 111111 }),
      ]);
      const { step } = stepWith({ repository });

      // Act
      await step.run(context({ limit: 1 }));

      // Assert
      expect(repository.completude).toEqual([
        { year: 2025, reposto: false, coveredThroughMonth: null },
      ]);
    });

    it('does not count deputados outside the exercicio of the year as pending', async () => {
      // Arrange
      const repository = repositoryOf([
        deputado({ deputadoId: 'dep-1', externalIdDeputado: 220593 }),
        deputado({
          deputadoId: 'dep-2',
          externalIdDeputado: 111111,
          intervalos: [
            intervalo('2019-02-01T12:00:00Z', '2023-01-31T00:00:00Z'),
          ],
        }),
      ]);
      const { step } = stepWith({ repository });

      // Act
      await step.run(context());

      // Assert
      expect(repository.completude).toEqual([
        { year: 2025, reposto: true, coveredThroughMonth: 7 },
      ]);
    });
  });

  describe('when the dump of the year was never ingested', () => {
    it('registers nothing, because there is no coverage month to apurar against', async () => {
      // Arrange
      const repository = repositoryOf([deputado()], { cobertura: null });
      const { step } = stepWith({ repository });

      // Act
      await step.run(context());

      // Assert
      expect(repository.completude).toEqual([]);
    });
  });

  describe('when a deputado-ano is already written', () => {
    it('makes no request for it without the refetch flag', async () => {
      // Arrange
      const repository = repositoryOf([deputado()], {
        reposicaoGravada: ['dep-1'],
      });
      const { step, despesasClient } = stepWith({ repository });

      // Act
      await step.run(context());

      // Assert
      expect((despesasClient as FakeClient).calls).toEqual([]);
      expect(repository.upserted).toEqual([]);
    });

    it('warns that a limited refetch never advances between runs', async () => {
      // Arrange
      const repository = repositoryOf(
        Array.from({ length: 3 }, (_, index) =>
          deputado({
            deputadoId: `dep-${index}`,
            externalIdDeputado: 200000 + index,
          }),
        ),
      );
      const { step } = stepWith({ repository, refetch: true });
      const logged: string[] = [];

      // Act
      await step.run(
        context({ limit: 1, reporter: { log: (line) => logged.push(line) } }),
      );

      // Assert
      expect(logged).toContainEqual(
        expect.stringContaining(
          'a recarga não é retomável: --limit reconsulta sempre os mesmos deputados',
        ),
      );
    });

    it('fetches it again under the refetch flag and reapura the completude', async () => {
      // Arrange
      const repository = repositoryOf([deputado()], {
        reposicaoGravada: ['dep-1'],
        cobertura: { coveredThroughMonth: 9, sigepaReposto: true },
      });
      const { step, despesasClient } = stepWith({
        repository,
        refetch: true,
        despesasClient: clientOf(
          new Map<number, DeputadoDespesasFetchResult>([
            [220593, { ok: true, despesas: [despesa({ mes: 8 })] }],
          ]),
        ),
      });

      // Act
      const result = await step.run(context());

      // Assert
      expect((despesasClient as FakeClient).calls).toHaveLength(1);
      expect(repository.upserted).toEqual([
        { deputadoId: 'dep-1', year: 2025, gastosJson: { '8': 123456 } },
      ]);
      expect(result).toMatchObject({ inserted: 0, updated: 1 });
      expect(repository.completude).toEqual([
        { year: 2025, reposto: true, coveredThroughMonth: 9 },
      ]);
    });
  });
});
