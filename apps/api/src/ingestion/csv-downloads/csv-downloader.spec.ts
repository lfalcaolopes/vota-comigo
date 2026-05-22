import { resolveCsvDownloaderConfig } from './csv-downloader-config';
import { buildCsvDownloadPlan } from './csv-download-plan';
import { runCsvDownloader } from './csv-downloader';

describe('csv downloader entrypoint', () => {
  describe('when building the download plan', () => {
    it('includes the annual datasets and single files for the default temporal window', () => {
      // Arrange
      const config = {
        force: false,
        years: [2001, 2002, 2003],
      };

      // Act
      const plan = buildCsvDownloadPlan(config);

      // Assert
      expect(plan).toHaveLength(20);
      expect(plan).toContainEqual({
        dataset: 'deputados',
        filename: 'deputados.csv',
        url: 'https://dadosabertos.camara.leg.br/arquivos/deputados/csv/deputados.csv',
        localPath: 'data/raw/deputados/deputados.csv',
      });
      expect(plan).toContainEqual({
        dataset: 'legislaturas',
        filename: 'legislaturas.csv',
        url: 'https://dadosabertos.camara.leg.br/arquivos/legislaturas/csv/legislaturas.csv',
        localPath: 'data/raw/legislaturas/legislaturas.csv',
      });
      expect(plan).toContainEqual({
        dataset: 'votacoes',
        filename: 'votacoes-2001.csv',
        url: 'https://dadosabertos.camara.leg.br/arquivos/votacoes/csv/votacoes-2001.csv',
        localPath: 'data/raw/votacoes/votacoes-2001.csv',
      });
      expect(plan).toContainEqual({
        dataset: 'proposicoesTemas',
        filename: 'proposicoesTemas-2003.csv',
        url: 'https://dadosabertos.camara.leg.br/arquivos/proposicoesTemas/csv/proposicoesTemas-2003.csv',
        localPath: 'data/raw/proposicoesTemas/proposicoesTemas-2003.csv',
      });
    });
  });

  describe('when resolving configuration in isolation', () => {
    it('returns the temporal window and overwrite policy without invoking the downloader entrypoint', () => {
      // Arrange
      const args = ['--force', '--from=2024', '--to=2025'];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution).toEqual({
        ok: true,
        config: {
          force: true,
          years: [2024, 2025],
        },
      });
    });
  });

  describe('when invoked by the public command', () => {
    it('uses the full temporal window when no temporal flags are provided', () => {
      // Arrange
      const args: string[] = [];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2003 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2001, 2002, 2003],
        },
      });
    });

    it('returns a controlled success result', () => {
      // Arrange
      const args = ['--from=2020', '--to=2025'];

      // Act
      const result = runCsvDownloader(args);

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2020, 2021, 2022, 2023, 2024, 2025],
        },
      });
    });

    it('resolves a window starting from a specific year', () => {
      // Arrange
      const args = ['--from=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2024, 2025, 2026],
        },
      });
    });

    it('resolves a window ending at a specific year', () => {
      // Arrange
      const args = ['--to=2003'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2001, 2002, 2003],
        },
      });
    });

    it('resolves explicit years before interval flags', () => {
      // Arrange
      const args = ['--from=2020', '--to=2026', '--years=2021,2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2021, 2024],
        },
      });
    });

    it('creates a plan for explicit years resolved by the public command', () => {
      // Arrange
      const args = ['--years=2021,2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.plan).toHaveLength(14);
        expect(result.plan).toContainEqual({
          dataset: 'votacoesVotos',
          filename: 'votacoesVotos-2021.csv',
          url: 'https://dadosabertos.camara.leg.br/arquivos/votacoesVotos/csv/votacoesVotos-2021.csv',
          localPath: 'data/raw/votacoesVotos/votacoesVotos-2021.csv',
        });
        expect(result.plan).toContainEqual({
          dataset: 'proposicoes',
          filename: 'proposicoes-2024.csv',
          url: 'https://dadosabertos.camara.leg.br/arquivos/proposicoes/csv/proposicoes-2024.csv',
          localPath: 'data/raw/proposicoes/proposicoes-2024.csv',
        });
      }
    });

    it('resolves the last five years including the current year', () => {
      // Arrange
      const args = ['--last=5'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2022, 2023, 2024, 2025, 2026],
        },
      });
    });

    it('creates a plan for recent windows resolved by the public command', () => {
      // Arrange
      const args = ['--last=5'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.plan).toHaveLength(32);
        expect(result.plan).toContainEqual({
          dataset: 'votacoesObjetos',
          filename: 'votacoesObjetos-2022.csv',
          url: 'https://dadosabertos.camara.leg.br/arquivos/votacoesObjetos/csv/votacoesObjetos-2022.csv',
          localPath: 'data/raw/votacoesObjetos/votacoesObjetos-2022.csv',
        });
        expect(result.plan).toContainEqual({
          dataset: 'votacoesProposicoes',
          filename: 'votacoesProposicoes-2026.csv',
          url: 'https://dadosabertos.camara.leg.br/arquivos/votacoesProposicoes/csv/votacoesProposicoes-2026.csv',
          localPath:
            'data/raw/votacoesProposicoes/votacoesProposicoes-2026.csv',
        });
      }
    });

    it('uses a custom base URL when building the plan for tests', () => {
      // Arrange
      const args = ['--years=2025'];

      // Act
      const result = runCsvDownloader(args, {
        baseUrl: 'https://example.test/arquivos',
        currentYear: 2026,
      });

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.plan).toContainEqual({
          dataset: 'votacoes',
          filename: 'votacoes-2025.csv',
          url: 'https://example.test/arquivos/votacoes/csv/votacoes-2025.csv',
          localPath: 'data/raw/votacoes/votacoes-2025.csv',
        });
      }
    });

    it('resolves the last ten years including the current year', () => {
      // Arrange
      const args = ['--last=10'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      });
    });

    it('combines force with a valid temporal window', () => {
      // Arrange
      const args = ['--force', '--years=2023,2025'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: true,
          years: [2023, 2025],
        },
      });
    });

    it('ignores the pnpm argument separator', () => {
      // Arrange
      const args = ['--', '--from=2020', '--to=2025'];

      // Act
      const result = runCsvDownloader(args);

      // Assert
      expect(result.args).toEqual(['--from=2020', '--to=2025']);
    });
  });

  describe('when invoked with invalid configuration', () => {
    it('rejects last combined with explicit years', () => {
      // Arrange
      const args = ['--last=5', '--years=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message:
          '--last não pode ser combinado com --years, --from ou --to. Escolha apenas uma forma de janela temporal.',
        args,
      });
    });

    it('rejects last combined with an interval start', () => {
      // Arrange
      const args = ['--last=5', '--from=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message:
          '--last não pode ser combinado com --years, --from ou --to. Escolha apenas uma forma de janela temporal.',
        args,
      });
    });

    it('rejects last combined with an interval end', () => {
      // Arrange
      const args = ['--last=5', '--to=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message:
          '--last não pode ser combinado com --years, --from ou --to. Escolha apenas uma forma de janela temporal.',
        args,
      });
    });

    it('rejects unsupported last windows', () => {
      // Arrange
      const args = ['--last=3'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: '--last aceita apenas os valores 5 ou 10.',
        args,
      });
    });

    it('rejects years outside the valid range', () => {
      // Arrange
      const args = ['--years=2000,2025'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: 'Ano 2000 inválido. Use anos entre 2001 e 2026.',
        args,
      });
      expect(result).not.toHaveProperty('plan');
    });

    it('rejects interval years outside the valid range', () => {
      // Arrange
      const args = ['--from=2000', '--to=2025'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: 'Ano 2000 inválido. Use anos entre 2001 e 2026.',
        args,
      });
    });

    it('rejects malformed year values', () => {
      // Arrange
      const args = ['--from=vinte'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: '--from deve receber um ano no formato YYYY.',
        args,
      });
    });

    it('rejects reversed intervals', () => {
      // Arrange
      const args = ['--from=2025', '--to=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: '--from deve ser menor ou igual a --to.',
        args,
      });
    });
  });
});
