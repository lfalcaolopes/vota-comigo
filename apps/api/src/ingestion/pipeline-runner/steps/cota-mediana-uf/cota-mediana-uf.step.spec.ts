import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';

import { createCotaMedianaUfStep } from './cota-mediana-uf.step';
import type {
  CotaMedianaUfRepository,
  CotaMedianaUfRow,
  GastoCotaAnualRow,
} from './cota-mediana-uf.repository.types';

const anoInteiro: readonly IntervaloExercicio[] = [
  { openedAt: '2019-02-01 00:00:00+00', closedAt: null },
];

type RepositoryState = {
  anos?: readonly number[];
  gastos?: Record<number, readonly GastoCotaAnualRow[]>;
  intervalos?: ReadonlyMap<string, readonly IntervaloExercicio[]>;
};

function createRepository(
  state: RepositoryState = {},
): CotaMedianaUfRepository & {
  replacements: { year: number; rows: readonly CotaMedianaUfRow[] }[];
} {
  const replacements: { year: number; rows: readonly CotaMedianaUfRow[] }[] =
    [];

  return {
    replacements,
    loadAnosComCobertura: () => Promise.resolve(state.anos ?? [2024]),
    loadDatasInicioLegislatura: () => Promise.resolve(['2023-02-01']),
    loadGastosAnuais: (year) => Promise.resolve(state.gastos?.[year] ?? []),
    loadIntervalosByDeputadoId: () =>
      Promise.resolve(
        state.intervalos ??
          new Map([
            ['a', anoInteiro],
            ['b', anoInteiro],
            ['c', anoInteiro],
          ]),
      ),
    replaceAno(year, rows) {
      replacements.push({ year, rows });
      return Promise.resolve({ inserted: rows.length });
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

function gasto(overrides: Partial<GastoCotaAnualRow> = {}): GastoCotaAnualRow {
  return {
    deputadoId: 'a',
    siglaUf: 'MG',
    gastosJson: { '3': { '1': 10000 } },
    ...overrides,
  };
}

describe('passo da mediana de gastos da cota por UF', () => {
  describe('when a year has coverage and eligible deputados', () => {
    it('replaces the medians of that year with the totals of the json', async () => {
      // Arrange
      const repository = createRepository({
        anos: [2024],
        gastos: {
          2024: [
            gasto({ deputadoId: 'a', gastosJson: { '1': { '1': 30000 } } }),
            gasto({ deputadoId: 'b', gastosJson: { '1': { '1': 10000 } } }),
            gasto({
              deputadoId: 'c',
              gastosJson: { '1': { '1': 15000 }, '2': { '4': 5000 } },
            }),
          ],
        },
      });
      const step = createCotaMedianaUfStep(repository);

      // Act
      const result = await step.run(createContext());

      // Assert
      expect(repository.replacements).toEqual([
        {
          year: 2024,
          rows: [
            {
              year: 2024,
              siglaUf: 'MG',
              valorUtilizadoMedianaCentavos: 20000,
              deputadoCount: 3,
            },
          ],
        },
      ]);
      expect(result).toMatchObject({ read: 3, inserted: 1 });
    });
  });

  describe('when several years carry coverage', () => {
    it('recalculates every one of them', async () => {
      // Arrange
      const repository = createRepository({
        anos: [2023, 2024],
        gastos: { 2023: [gasto()], 2024: [gasto()] },
      });
      const step = createCotaMedianaUfStep(repository);

      // Act
      await step.run(createContext());

      // Assert
      expect(repository.replacements.map((entry) => entry.year)).toEqual([
        2023, 2024,
      ]);
    });
  });

  describe('when the exercise intervals have not been derived yet', () => {
    it('keeps the medians already loaded instead of wiping them', async () => {
      // Arrange
      const repository = createRepository({ intervalos: new Map() });
      const step = createCotaMedianaUfStep(repository);

      // Act
      const result = await step.run(createContext());

      // Assert
      expect(repository.replacements).toEqual([]);
      expect(result).toMatchObject({ read: 0, inserted: 0 });
    });
  });

  describe('when the run is a dry run', () => {
    it('calculates without replacing anything', async () => {
      // Arrange
      const repository = createRepository({ gastos: { 2024: [gasto()] } });
      const step = createCotaMedianaUfStep(repository);

      // Act
      const result = await step.run(createContext({ dryRun: true }));

      // Assert
      expect(repository.replacements).toEqual([]);
      expect(result).toMatchObject({ inserted: 0 });
    });
  });
});
