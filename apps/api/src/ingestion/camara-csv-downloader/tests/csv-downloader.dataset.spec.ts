import { resolveCsvDownloaderConfig } from '../config/csv-downloader.config';
import { buildCsvDownloadPlan } from '../plan/csv-download-plan';

describe('csv downloader dataset selection', () => {
  describe('when the plan is restricted to a dataset', () => {
    it('builds only the requested dataset and drops single-file datasets', () => {
      // Arrange
      const config = {
        force: false,
        years: [1991, 2007],
        datasets: ['proposicoes'],
      };

      // Act
      const plan = buildCsvDownloadPlan(config);

      // Assert
      expect(plan.map((item) => item.filename).sort()).toEqual([
        'proposicoes-1991.csv',
        'proposicoes-2007.csv',
      ]);
    });
  });

  describe('when resolving a proposicoes-only download', () => {
    it('accepts years before the 2001 floor for proposicoes', () => {
      // Arrange
      const args = ['--dataset=proposicoes', '--years=1991,1997'];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution).toEqual({
        ok: true,
        config: {
          force: false,
          years: [1991, 1997],
          datasets: ['proposicoes'],
        },
      });
    });
  });

  describe('when resolving a proposicoesTemas-only download', () => {
    it('accepts years before the 2001 floor for proposicoesTemas', () => {
      // Arrange
      const args = ['--dataset=proposicoesTemas', '--years=1991,2000'];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution).toEqual({
        ok: true,
        config: {
          force: false,
          years: [1991, 2000],
          datasets: ['proposicoesTemas'],
        },
      });
    });
  });

  describe('when resolving any other dataset', () => {
    it('keeps the 2001 floor for years before 2001', () => {
      // Arrange
      const args = ['--dataset=votacoes', '--years=1991'];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution.ok).toBe(false);
    });
  });
});
