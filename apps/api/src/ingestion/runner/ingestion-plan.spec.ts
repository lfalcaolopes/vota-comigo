import { buildIngestionPlan } from './ingestion-plan';
import type { IngestionRunnerConfig } from './ingestion-runner.types';

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
});
