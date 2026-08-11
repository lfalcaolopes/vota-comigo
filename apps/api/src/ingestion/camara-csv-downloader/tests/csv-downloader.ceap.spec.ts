import { resolveCsvDownloaderConfig } from '../config/csv-downloader.config';
import { buildCsvDownloadPlan } from '../plan/csv-download-plan';

describe('csv downloader cota parlamentar source', () => {
  describe('when the plan is restricted to the cota dataset', () => {
    it('builds the annual archive URL with its own host, path and filename', () => {
      // Arrange
      const config = {
        force: false,
        years: [2025],
        datasets: ['ceap'],
      };

      // Act
      const plan = buildCsvDownloadPlan(config);

      // Assert
      expect(plan).toEqual([
        {
          dataset: 'ceap',
          filename: 'Ano-2025.csv',
          url: 'https://www.camara.leg.br/cotas/Ano-2025.csv.zip',
          localPath: 'data/raw/ceap/Ano-2025.csv',
          archive: { entryName: 'Ano-2025.csv' },
        },
      ]);
    });
  });

  describe('when no dataset is requested', () => {
    it('leaves the cota out of the plan and keeps the other datasets untouched', () => {
      // Arrange
      const config = {
        force: false,
        years: [2025],
      };

      // Act
      const plan = buildCsvDownloadPlan(config);

      // Assert
      expect(plan.map((item) => item.dataset)).toEqual([
        'deputados',
        'legislaturas',
        'votacoes',
        'votacoesVotos',
        'votacoesProposicoes',
        'proposicoes',
        'proposicoesTemas',
      ]);
      expect(plan.map((item) => item.url)).toEqual([
        'https://dadosabertos.camara.leg.br/arquivos/deputados/csv/deputados.csv',
        'https://dadosabertos.camara.leg.br/arquivos/legislaturas/csv/legislaturas.csv',
        'https://dadosabertos.camara.leg.br/arquivos/votacoes/csv/votacoes-2025.csv',
        'https://dadosabertos.camara.leg.br/arquivos/votacoesVotos/csv/votacoesVotos-2025.csv',
        'https://dadosabertos.camara.leg.br/arquivos/votacoesProposicoes/csv/votacoesProposicoes-2025.csv',
        'https://dadosabertos.camara.leg.br/arquivos/proposicoes/csv/proposicoes-2025.csv',
        'https://dadosabertos.camara.leg.br/arquivos/proposicoesTemas/csv/proposicoesTemas-2025.csv',
      ]);
    });
  });

  describe('when the plan mixes the cota with plain csv datasets', () => {
    it('marks only the cota as a compressed download', () => {
      // Arrange
      const config = {
        force: false,
        years: [2025],
        datasets: ['deputados', 'votacoes', 'proposicoes', 'ceap'],
      };

      // Act
      const plan = buildCsvDownloadPlan(config);

      // Assert
      expect(
        plan
          .filter((item) => item.archive !== undefined)
          .map((item) => item.dataset),
      ).toEqual(['ceap']);
    });
  });

  describe('when the cota is requested without a year window', () => {
    it('starts the default window at the first year in which the cota file exists', () => {
      // Arrange
      const args = ['--dataset=ceap'];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2010,
      });

      // Assert
      expect(resolution).toEqual({
        ok: true,
        config: {
          force: false,
          years: [2008, 2009, 2010],
          datasets: ['ceap'],
        },
      });
    });
  });

  describe('when a year before the first cota file is requested', () => {
    it('rejects the resolution with a message of its own', () => {
      // Arrange
      const args = ['--dataset=ceap', '--years=2007'];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution).toEqual({
        ok: false,
        message:
          'Ano 2007 inválido para o conjunto ceap. Os arquivos da cota parlamentar existem a partir de 2008.',
      });
    });

    it('accepts the first year in which the cota file exists', () => {
      // Arrange
      const args = ['--dataset=ceap', '--years=2008'];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution).toEqual({
        ok: true,
        config: {
          force: false,
          years: [2008],
          datasets: ['ceap'],
        },
      });
    });
  });
});
