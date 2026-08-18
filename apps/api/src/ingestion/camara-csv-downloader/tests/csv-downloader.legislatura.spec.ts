import { resolveCsvDownloaderConfig } from '../config/csv-downloader.config';
import { buildCsvDownloadPlan } from '../plan/csv-download-plan';
import { deriveLegislaturasFromYears } from '../plan/legislatura-range';

describe('legislatura range derived from the years in scope', () => {
  describe('when the years fall inside a single legislatura', () => {
    it('derives one legislatura for the current window', () => {
      // Arrange
      const years = [2023, 2024, 2025, 2026];

      // Act
      const legislaturas = deriveLegislaturasFromYears(years);

      // Assert
      expect(legislaturas).toEqual([57]);
    });
  });

  describe('when the years cross a legislatura turn', () => {
    it('derives both legislaturas, with the turn year opening the next one', () => {
      // Arrange
      const years = [2002, 2003];

      // Act
      const legislaturas = deriveLegislaturasFromYears(years);

      // Assert
      expect(legislaturas).toEqual([51, 52]);
    });

    it('keeps the last year of a legislatura in the legislatura that opened it', () => {
      // Arrange
      const years = [2006, 2007];

      // Act
      const legislaturas = deriveLegislaturasFromYears(years);

      // Assert
      expect(legislaturas).toEqual([52, 53]);
    });
  });

  describe('when the years reach below the ADR 003 floor', () => {
    it('drops the years below legislatura 51 and keeps the rest', () => {
      // Arrange
      const years = [1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004];

      // Act
      const legislaturas = deriveLegislaturasFromYears(years);

      // Assert
      expect(legislaturas).toEqual([51, 52]);
    });

    it('derives no legislatura when every year is below the floor', () => {
      // Arrange
      const years = [1991, 1997];

      // Act
      const legislaturas = deriveLegislaturasFromYears(years);

      // Assert
      expect(legislaturas).toEqual([]);
    });
  });

  describe('when the years are partial and unordered', () => {
    it('derives each legislatura once, in ascending order', () => {
      // Arrange
      const years = [2025, 2011, 2024];

      // Act
      const legislaturas = deriveLegislaturasFromYears(years);

      // Assert
      expect(legislaturas).toEqual([54, 57]);
    });
  });
});

describe('csv downloader legislatura scoped dataset', () => {
  describe('when the plan is restricted to orgaosDeputados', () => {
    it('builds one item per legislatura in scope', () => {
      // Arrange
      const config = {
        force: false,
        years: [2022, 2023, 2024],
        datasets: ['orgaosDeputados'],
      };

      // Act
      const plan = buildCsvDownloadPlan(config);

      // Assert
      expect(plan).toEqual([
        {
          dataset: 'orgaosDeputados',
          filename: 'orgaosDeputados-L56.csv',
          url: 'https://dadosabertos.camara.leg.br/arquivos/orgaosDeputados/csv/orgaosDeputados-L56.csv',
          localPath: 'data/raw/orgaosDeputados/orgaosDeputados-L56.csv',
        },
        {
          dataset: 'orgaosDeputados',
          filename: 'orgaosDeputados-L57.csv',
          url: 'https://dadosabertos.camara.leg.br/arquivos/orgaosDeputados/csv/orgaosDeputados-L57.csv',
          localPath: 'data/raw/orgaosDeputados/orgaosDeputados-L57.csv',
        },
      ]);
    });

    it('respects --from and --to as the annual datasets do', () => {
      // Arrange
      const args = ['--dataset=orgaosDeputados', '--from=2015', '--to=2016'];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2026,
      });
      const plan = resolution.ok ? buildCsvDownloadPlan(resolution.config) : [];

      // Assert
      expect(plan.map((item) => item.filename)).toEqual([
        'orgaosDeputados-L55.csv',
      ]);
    });
  });

  describe('when the window reaches below the ADR 003 floor', () => {
    it('keeps the plan of the other datasets and drops only the unreachable legislaturas', () => {
      // Arrange
      const args = [
        '--dataset=proposicoes,orgaosDeputados',
        '--years=1997,2004',
      ];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2026,
      });
      const plan = resolution.ok ? buildCsvDownloadPlan(resolution.config) : [];

      // Assert
      expect(plan.map((item) => item.filename)).toEqual([
        'proposicoes-1997.csv',
        'proposicoes-2004.csv',
        'orgaosDeputados-L52.csv',
      ]);
    });
  });
});

describe('csv downloader datasets of proposicoes assinadas and orgaos', () => {
  describe('when no dataset is requested', () => {
    it('includes proposicoesAutores, orgaos and orgaosDeputados in the default plan', () => {
      // Arrange
      const config = {
        force: false,
        years: [2025],
      };

      // Act
      const plan = buildCsvDownloadPlan(config);

      // Assert
      expect(plan).toContainEqual({
        dataset: 'proposicoesAutores',
        filename: 'proposicoesAutores-2025.csv',
        url: 'https://dadosabertos.camara.leg.br/arquivos/proposicoesAutores/csv/proposicoesAutores-2025.csv',
        localPath: 'data/raw/proposicoesAutores/proposicoesAutores-2025.csv',
      });
      expect(plan).toContainEqual({
        dataset: 'orgaos',
        filename: 'orgaos.csv',
        url: 'https://dadosabertos.camara.leg.br/arquivos/orgaos/csv/orgaos.csv',
        localPath: 'data/raw/orgaos/orgaos.csv',
      });
      expect(plan).toContainEqual({
        dataset: 'orgaosDeputados',
        filename: 'orgaosDeputados-L57.csv',
        url: 'https://dadosabertos.camara.leg.br/arquivos/orgaosDeputados/csv/orgaosDeputados-L57.csv',
        localPath: 'data/raw/orgaosDeputados/orgaosDeputados-L57.csv',
      });
    });
  });

  describe('when the plan is restricted to proposicoesAutores', () => {
    it('builds one annual item per year in scope', () => {
      // Arrange
      const config = {
        force: false,
        years: [2024, 2025],
        datasets: ['proposicoesAutores'],
      };

      // Act
      const plan = buildCsvDownloadPlan(config);

      // Assert
      expect(plan.map((item) => item.filename)).toEqual([
        'proposicoesAutores-2024.csv',
        'proposicoesAutores-2025.csv',
      ]);
    });

    it('keeps the 2001 floor for years before the first published file', () => {
      // Arrange
      const args = ['--dataset=proposicoesAutores', '--years=2000'];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution.ok).toBe(false);
    });
  });
});
