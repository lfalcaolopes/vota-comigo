import { formatResumeCommand } from '../download/resume-command';
import type { CsvDownloadFailureSummary } from '../types/csv-downloader.types';

describe('formatResumeCommand', () => {
  describe('when there are no failures', () => {
    it('returns undefined', () => {
      // Arrange
      const failures: readonly CsvDownloadFailureSummary[] = [];

      // Act
      const command = formatResumeCommand(failures);

      // Assert
      expect(command).toBeUndefined();
    });
  });

  describe('when failures span multiple annual datasets and years', () => {
    it('combines unique datasets and sorted years into a single command', () => {
      // Arrange
      const failures: readonly CsvDownloadFailureSummary[] = [
        failure('votacoesVotos', 'votacoesVotos-2022.csv'),
        failure('votacoesVotos', 'votacoesVotos-2020.csv'),
        failure('votacoesVotos', 'votacoesVotos-2021.csv'),
        failure('votacoesProposicoes', 'votacoesProposicoes-2024.csv'),
      ];

      // Act
      const command = formatResumeCommand(failures);

      // Assert
      expect(command).toBe(
        'pnpm download:csvs -- --dataset=votacoesVotos,votacoesProposicoes --years=2020,2021,2022,2024',
      );
    });
  });

  describe('when every failure is a single-file dataset without a year', () => {
    it('omits the years flag', () => {
      // Arrange
      const failures: readonly CsvDownloadFailureSummary[] = [
        failure('deputados', 'deputados.csv'),
        failure('legislaturas', 'legislaturas.csv'),
      ];

      // Act
      const command = formatResumeCommand(failures);

      // Assert
      expect(command).toBe(
        'pnpm download:csvs -- --dataset=deputados,legislaturas',
      );
    });
  });

  describe('when failures mix annual and single-file datasets', () => {
    it('includes the years from the annual datasets only', () => {
      // Arrange
      const failures: readonly CsvDownloadFailureSummary[] = [
        failure('deputados', 'deputados.csv'),
        failure('votacoes', 'votacoes-2025.csv'),
      ];

      // Act
      const command = formatResumeCommand(failures);

      // Assert
      expect(command).toBe(
        'pnpm download:csvs -- --dataset=deputados,votacoes --years=2025',
      );
    });
  });
});

function failure(
  dataset: string,
  filename: string,
): CsvDownloadFailureSummary {
  return {
    dataset,
    filename,
    reason: 'terminated',
  };
}
