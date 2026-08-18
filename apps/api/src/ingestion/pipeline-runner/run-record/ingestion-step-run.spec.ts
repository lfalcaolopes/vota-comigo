import { buildIngestionStepRunRows } from './ingestion-step-run';
import type { StepSummary } from '../types/ingestion-pipeline-runner.types';

function summary(
  overrides: Partial<StepSummary> & { stepName: string },
): StepSummary {
  return {
    read: 0,
    inserted: 0,
    updated: 0,
    ignored: 0,
    rejected: [],
    externalGaps: [],
    durationMs: 0,
    ...overrides,
  };
}

describe('buildIngestionStepRunRows', () => {
  describe('when a step ran across multiple years', () => {
    it('sums read across years and records the min/max year of the years that read something', () => {
      // Arrange
      const summaries = [
        summary({ stepName: 'votos', year: 2020, read: 100 }),
        summary({ stepName: 'votos', year: 2021, read: 250 }),
        summary({ stepName: 'votos', year: 2022, read: 50 }),
      ];

      // Act
      const rows = buildIngestionStepRunRows(summaries, {
        executedAt: '2026-08-14T12:00:00.000Z',
      });

      // Assert
      expect(rows).toEqual([
        {
          stepName: 'votos',
          executedAt: '2026-08-14T12:00:00.000Z',
          recordsRead: 400,
          firstYear: 2020,
          lastYear: 2022,
        },
      ]);
    });
  });

  describe('when a year read zero records (fonte ausente)', () => {
    it('excludes that year from the first/last year window but keeps its read in the sum', () => {
      // Arrange
      const summaries = [
        summary({ stepName: 'votos', year: 2020, read: 0 }),
        summary({ stepName: 'votos', year: 2021, read: 300 }),
      ];

      // Act
      const rows = buildIngestionStepRunRows(summaries, {
        executedAt: '2026-08-14T12:00:00.000Z',
      });

      // Assert
      expect(rows).toEqual([
        {
          stepName: 'votos',
          executedAt: '2026-08-14T12:00:00.000Z',
          recordsRead: 300,
          firstYear: 2021,
          lastYear: 2021,
        },
      ]);
    });

    it('records a null window when every year read zero records', () => {
      // Arrange
      const summaries = [
        summary({ stepName: 'votos', year: 2020, read: 0 }),
        summary({ stepName: 'votos', year: 2021, read: 0 }),
      ];

      // Act
      const rows = buildIngestionStepRunRows(summaries, {
        executedAt: '2026-08-14T12:00:00.000Z',
      });

      // Assert
      expect(rows).toEqual([
        {
          stepName: 'votos',
          executedAt: '2026-08-14T12:00:00.000Z',
          recordsRead: 0,
          firstYear: null,
          lastYear: null,
        },
      ]);
    });
  });

  describe('when a step is single-scoped (no year)', () => {
    it('records a null first/last year window', () => {
      // Arrange
      const summaries = [summary({ stepName: 'legislaturas', read: 57 })];

      // Act
      const rows = buildIngestionStepRunRows(summaries, {
        executedAt: '2026-08-14T12:00:00.000Z',
      });

      // Assert
      expect(rows).toEqual([
        {
          stepName: 'legislaturas',
          executedAt: '2026-08-14T12:00:00.000Z',
          recordsRead: 57,
          firstYear: null,
          lastYear: null,
        },
      ]);
    });
  });

  describe('when a step aborted the run', () => {
    it('discards the aborted step and keeps the rows for steps that already completed', () => {
      // Arrange
      const summaries = [
        summary({ stepName: 'legislaturas', read: 57 }),
        summary({ stepName: 'deputados', read: 10 }),
      ];

      // Act
      const rows = buildIngestionStepRunRows(summaries, {
        abortedStepName: 'deputados',
        executedAt: '2026-08-14T12:00:00.000Z',
      });

      // Assert
      expect(rows).toEqual([
        {
          stepName: 'legislaturas',
          executedAt: '2026-08-14T12:00:00.000Z',
          recordsRead: 57,
          firstYear: null,
          lastYear: null,
        },
      ]);
    });
  });
});
