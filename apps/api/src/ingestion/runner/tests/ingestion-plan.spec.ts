import { buildIngestionPlan } from '../ingestion-plan';
import type { IngestionRunnerConfig } from '../ingestion-runner.types';

const steps = [
  { name: 'legislaturas', scope: 'single' as const },
  { name: 'votacoes', scope: 'annual' as const },
];

function config(
  overrides: Partial<IngestionRunnerConfig> = {},
): IngestionRunnerConfig {
  return {
    only: undefined,
    years: [2024, 2025],
    dryRun: false,
    strict: false,
    debug: false,
    refetchHistorico: false,
    ...overrides,
  };
}

describe('ingestion plan', () => {
  describe('when expanding steps over the temporal window', () => {
    it('plans single-file steps once and annual steps once per year, in step order', () => {
      // Arrange
      const runnerConfig = config();

      // Act
      const plan = buildIngestionPlan(runnerConfig, steps);

      // Assert
      expect(plan).toEqual([
        { stepName: 'legislaturas', scope: 'single' },
        { stepName: 'votacoes', scope: 'annual', year: 2024 },
        { stepName: 'votacoes', scope: 'annual', year: 2025 },
      ]);
    });
  });

  describe('when a step is marked as manual', () => {
    const stepsWithManual = [
      ...steps,
      { name: 'deputado_historico', scope: 'single' as const, manual: true },
    ];

    it('leaves the manual step out of the default run', () => {
      // Arrange
      const runnerConfig = config();

      // Act
      const plan = buildIngestionPlan(runnerConfig, stepsWithManual);

      // Assert
      expect(plan.map((entry) => entry.stepName)).not.toContain(
        'deputado_historico',
      );
    });

    it('runs the manual step when it is named explicitly in --only', () => {
      // Arrange
      const runnerConfig = config({ only: ['deputado_historico'] });

      // Act
      const plan = buildIngestionPlan(runnerConfig, stepsWithManual);

      // Assert
      expect(plan).toEqual([
        { stepName: 'deputado_historico', scope: 'single' },
      ]);
    });
  });

  describe('when --only selects a subset of steps', () => {
    it('plans only the selected steps', () => {
      // Arrange
      const runnerConfig = config({ only: ['votacoes'] });

      // Act
      const plan = buildIngestionPlan(runnerConfig, steps);

      // Assert
      expect(plan).toEqual([
        { stepName: 'votacoes', scope: 'annual', year: 2024 },
        { stepName: 'votacoes', scope: 'annual', year: 2025 },
      ]);
    });
  });

  describe('when a single-file step is selected over a multi-year window', () => {
    it('plans the single-file step exactly once, independent of the temporal window', () => {
      // Arrange
      const runnerConfig = config({
        only: ['legislaturas'],
        years: [2020, 2021, 2022],
      });

      // Act
      const plan = buildIngestionPlan(runnerConfig, steps);

      // Assert
      expect(plan).toEqual([{ stepName: 'legislaturas', scope: 'single' }]);
    });
  });

  describe('when a step reads from a dataset other than its own name', () => {
    it('carries the source dataset into each planned entry', () => {
      // Arrange
      const partidosStep = {
        name: 'partidos',
        scope: 'annual' as const,
        dataset: 'votacoesVotos',
      };
      const runnerConfig = config({ only: ['partidos'], years: [2024, 2025] });

      // Act
      const plan = buildIngestionPlan(runnerConfig, [...steps, partidosStep]);

      // Assert
      expect(plan).toEqual([
        {
          stepName: 'partidos',
          scope: 'annual',
          dataset: 'votacoesVotos',
          year: 2024,
        },
        {
          stepName: 'partidos',
          scope: 'annual',
          dataset: 'votacoesVotos',
          year: 2025,
        },
      ]);
    });
  });

  describe('when a step declares companion datasets', () => {
    it('carries the companion datasets into each planned entry', () => {
      // Arrange
      const votacoesStep = {
        name: 'votacoes',
        scope: 'annual' as const,
        companionDatasets: ['votacoesVotos'],
      };
      const runnerConfig = config({ only: ['votacoes'], years: [2024] });

      // Act
      const plan = buildIngestionPlan(runnerConfig, [votacoesStep]);

      // Assert
      expect(plan).toEqual([
        {
          stepName: 'votacoes',
          scope: 'annual',
          companionDatasets: ['votacoesVotos'],
          year: 2024,
        },
      ]);
    });
  });
});
