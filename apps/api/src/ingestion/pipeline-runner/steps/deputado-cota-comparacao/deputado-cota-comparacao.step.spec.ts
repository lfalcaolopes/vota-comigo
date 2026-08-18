import type { LegislaturaPeriodo } from '@/comparativo-deputados/rules/janela-comparativo';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';

import { createDeputadoCotaComparacaoStep } from './deputado-cota-comparacao.step';
import type {
  CoberturaAnualRow,
  DeputadoCotaComparacaoRepository,
  DeputadoCotaComparacaoRow,
  DeputadoJanelaRow,
  GastoCotaRow,
  MedianaUfRow,
} from './deputado-cota-comparacao.repository.types';

const REFERENCIA = new Date('2026-08-16T00:00:00Z');

const LEGISLATURAS: readonly LegislaturaPeriodo[] = [
  { legislatura: 54, dataInicio: '2011-02-01', dataFim: '2015-01-31' },
  { legislatura: 55, dataInicio: '2015-02-01', dataFim: '2019-01-31' },
  { legislatura: 56, dataInicio: '2019-02-01', dataFim: '2023-01-31' },
  { legislatura: 57, dataInicio: '2023-02-01', dataFim: '2027-01-31' },
];

const EM_EXERCICIO: readonly IntervaloExercicio[] = [
  { openedAt: '2023-02-01 00:00:00+00', closedAt: null },
];

const COBERTURAS: readonly CoberturaAnualRow[] = [
  { year: 2023, coveredThroughMonth: 12, ...semSigepa() },
  { year: 2024, coveredThroughMonth: 12, ...semSigepa() },
  { year: 2025, coveredThroughMonth: 12, ...semSigepa() },
  { year: 2026, coveredThroughMonth: 6, ...semSigepa() },
];

const MEDIANAS: readonly MedianaUfRow[] = [2023, 2024, 2025].map((year) => ({
  year,
  siglaUf: 'MG',
  amountUsedCents: 200000,
  deputadoCount: 40,
}));

function semSigepa() {
  return { sigepaReposto: false, sigepaCoveredThroughMonth: null };
}

function gasto(overrides: Partial<GastoCotaRow> = {}): GastoCotaRow {
  return {
    deputadoId: 'a',
    year: 2023,
    siglaUf: 'MG',
    gastosJson: { '1': { '1': 100000 } },
    gastosSigepaJson: null,
    ...overrides,
  };
}

type RepositoryState = {
  coberturas?: readonly CoberturaAnualRow[];
  deputados?: readonly DeputadoJanelaRow[];
  gastos?: readonly GastoCotaRow[];
  intervalos?: ReadonlyMap<string, readonly IntervaloExercicio[]>;
  medianas?: readonly MedianaUfRow[];
};

function createRepository(state: RepositoryState = {}): {
  repository: DeputadoCotaComparacaoRepository;
  replacements: (readonly DeputadoCotaComparacaoRow[])[];
} {
  const replacements: (readonly DeputadoCotaComparacaoRow[])[] = [];

  return {
    replacements,
    repository: {
      loadCoberturas: () => Promise.resolve(state.coberturas ?? COBERTURAS),
      loadDeputados: () =>
        Promise.resolve(
          state.deputados ?? [
            {
              deputadoId: 'a',
              legislaturaFinal: 57,
              legislaturaFinalPeriodo: {
                dataInicio: '2023-02-01',
                dataFim: '2027-01-31',
              },
            },
          ],
        ),
      loadGastos: (deputadoIds) =>
        Promise.resolve(
          (state.gastos ?? []).filter((row) =>
            deputadoIds.includes(row.deputadoId),
          ),
        ),
      loadIntervalosByDeputadoId: () =>
        Promise.resolve(state.intervalos ?? new Map([['a', EM_EXERCICIO]])),
      loadLegislaturas: () => Promise.resolve(LEGISLATURAS),
      loadMedianas: () => Promise.resolve(state.medianas ?? MEDIANAS),
      replaceAll(rows) {
        replacements.push(rows);
        return Promise.resolve({ inserted: rows.length });
      },
    },
  };
}

function createContext(
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    debug: false,
    ...overrides,
  } as IngestionStepContext;
}

describe('passo da comparação de gasto de cota com a mediana da UF', () => {
  describe('deputado em exercício com gasto em toda a janela', () => {
    it('publica o percentual sobre a soma das medianas da legislatura', async () => {
      // Arrange
      const { repository, replacements } = createRepository({
        gastos: [
          gasto({ year: 2023 }),
          gasto({ year: 2024 }),
          gasto({ year: 2025 }),
        ],
      });
      const step = createDeputadoCotaComparacaoStep(
        repository,
        () => REFERENCIA,
      );

      // Act
      const result = await step.run(createContext());

      // Assert
      expect(replacements).toHaveLength(1);
      expect(replacements[0]).toHaveLength(1);
      expect(replacements[0][0]).toMatchObject({
        deputadoId: 'a',
        legislatura: 57,
        referencia: '2026-08-16',
        cota: {
          status: 'comparavel',
          percentualSobreMedianaUf: 50,
          gastoNaComparacaoCents: 300000,
          siglaUf: 'MG',
          anosNaComparacao: 3,
        },
      });
      expect(result).toMatchObject({ inserted: 1 });
    });

    it('materializa as duas réguas do gasto junto do agregado', async () => {
      // Arrange
      const { repository, replacements } = createRepository({
        gastos: [
          gasto({ year: 2023 }),
          gasto({ year: 2024 }),
          gasto({ year: 2025 }),
        ],
      });
      const step = createDeputadoCotaComparacaoStep(
        repository,
        () => REFERENCIA,
      );

      // Act
      await step.run(createContext());

      // Assert
      expect(replacements[0][0].cota).toMatchObject({
        medianaNaComparacaoCents: 600000,
        // Fevereiro de 2023 em diante, os três anos comparados ao teto de MG.
        tetoNaComparacaoCents: 4_188_651 * 35,
      });
    });

    it('guarda o detalhamento ano a ano junto do agregado', async () => {
      // Arrange
      const { repository, replacements } = createRepository({
        gastos: [gasto({ year: 2023 })],
      });
      const step = createDeputadoCotaComparacaoStep(
        repository,
        () => REFERENCIA,
      );

      // Act
      await step.run(createContext());

      // Assert
      const { cota } = replacements[0][0];
      expect(cota.anos.map((ano) => ano.year)).toEqual([
        2023, 2024, 2025, 2026,
      ]);
      expect(cota.anos.map((ano) => ano.naComparacao)).toEqual([
        true,
        true,
        true,
        false,
      ]);
    });
  });

  describe('ano sem mediana publicada', () => {
    it('fica fora do denominador em vez de encolher a comparação', async () => {
      // Arrange
      const { repository, replacements } = createRepository({
        gastos: [gasto({ year: 2023 }), gasto({ year: 2024 })],
        medianas: MEDIANAS.filter((mediana) => mediana.year !== 2024),
      });
      const step = createDeputadoCotaComparacaoStep(
        repository,
        () => REFERENCIA,
      );

      // Act
      await step.run(createContext());

      // Assert
      expect(replacements[0][0].cota).toMatchObject({
        status: 'comparavel',
        percentualSobreMedianaUf: 25,
        anosNaComparacao: 2,
      });
    });
  });

  describe('deputado sem nenhum gasto registrado', () => {
    it('publica a linha como sem comparação', async () => {
      // Arrange
      const { repository, replacements } = createRepository({ gastos: [] });
      const step = createDeputadoCotaComparacaoStep(
        repository,
        () => REFERENCIA,
      );

      // Act
      await step.run(createContext());

      // Assert
      expect(replacements[0][0].cota).toMatchObject({
        status: 'sem-comparacao',
        motivo: 'sem-gastos',
      });
    });
  });

  describe('deputado cuja última legislatura é anterior ao piso da comparação', () => {
    it('não recebe linha nenhuma', async () => {
      // Arrange
      const { repository, replacements } = createRepository({
        deputados: [
          {
            deputadoId: 'antigo',
            legislaturaFinal: 54,
            legislaturaFinalPeriodo: {
              dataInicio: '2011-02-01',
              dataFim: '2015-01-31',
            },
          },
        ],
        intervalos: new Map([
          [
            'antigo',
            [{ openedAt: '2011-02-01 00:00:00+00', closedAt: '2014-06-01' }],
          ],
        ]),
      });
      const step = createDeputadoCotaComparacaoStep(
        repository,
        () => REFERENCIA,
      );

      // Act
      await step.run(createContext());

      // Assert
      expect(replacements).toEqual([[]]);
    });
  });

  describe('quando os intervalos de exercício ainda não foram derivados', () => {
    it('mantém as comparações já publicadas em vez de apagá-las', async () => {
      // Arrange
      const { repository, replacements } = createRepository({
        intervalos: new Map(),
      });
      const step = createDeputadoCotaComparacaoStep(
        repository,
        () => REFERENCIA,
      );

      // Act
      const result = await step.run(createContext());

      // Assert
      expect(replacements).toEqual([]);
      expect(result).toMatchObject({ read: 0, inserted: 0 });
    });
  });

  describe('quando nenhuma mediana foi calculada', () => {
    it('mantém as comparações já publicadas em vez de apagá-las', async () => {
      // Arrange
      const { repository, replacements } = createRepository({ medianas: [] });
      const step = createDeputadoCotaComparacaoStep(
        repository,
        () => REFERENCIA,
      );

      // Act
      const result = await step.run(createContext());

      // Assert
      expect(replacements).toEqual([]);
      expect(result).toMatchObject({ read: 0, inserted: 0 });
    });
  });

  describe('quando a execução é um ensaio', () => {
    it('calcula sem gravar nada', async () => {
      // Arrange
      const { repository, replacements } = createRepository({
        gastos: [gasto({ year: 2023 })],
      });
      const step = createDeputadoCotaComparacaoStep(
        repository,
        () => REFERENCIA,
      );

      // Act
      const result = await step.run(createContext({ dryRun: true }));

      // Assert
      expect(replacements).toEqual([]);
      expect(result).toMatchObject({ inserted: 0 });
    });
  });
});
