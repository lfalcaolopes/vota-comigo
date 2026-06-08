import { resolveCsvDownloaderConfig } from '../config/csv-downloader.config';
import { executeCsvDownloader, runCsvDownloader } from '../csv-downloader';
import { buildCsvDownloadPlan } from '../plan/csv-download-plan';
import type { CsvDownloadPlanItem } from '../types/csv-downloader.types';

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
      expect(plan).toHaveLength(17);
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
        expect(result.plan).toHaveLength(12);
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
        expect(result.plan).toHaveLength(27);
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

  describe('when executing the public command', () => {
    it('processes every planned item and returns a successful exit code when no item fails', async () => {
      // Arrange
      const args = ['--years=2025'];
      const downloadItem = jest.fn((item: CsvDownloadPlanItem) => {
        if (item.filename === 'deputados.csv') {
          return Promise.resolve({
            status: 'skipped' as const,
            item,
            message: `${item.filename} já existe, pulando.`,
          });
        }

        return Promise.resolve({
          status: 'downloaded' as const,
          item,
          message: `${item.filename} baixado com sucesso.`,
        });
      });

      // Act
      const result = await executeCsvDownloader(args, {
        currentYear: 2026,
        downloadItem,
      });

      // Assert
      expect(downloadItem).toHaveBeenCalledTimes(7);
      expect(downloadItem.mock.calls.map(([item]) => item.filename)).toEqual([
        'deputados.csv',
        'legislaturas.csv',
        'votacoes-2025.csv',
        'votacoesVotos-2025.csv',
        'votacoesProposicoes-2025.csv',
        'proposicoes-2025.csv',
        'proposicoesTemas-2025.csv',
      ]);
      expect(result).toMatchObject({
        ok: true,
        exitCode: 0,
        summary: {
          downloaded: 6,
          skipped: 1,
          failed: 0,
          failures: [],
        },
      });
    });

    it('runs at most three downloads at the same time', async () => {
      // Arrange
      const args = ['--years=2025'];
      let activeDownloads = 0;
      let maxActiveDownloads = 0;
      const downloadItem = jest.fn(async (item: CsvDownloadPlanItem) => {
        activeDownloads += 1;
        maxActiveDownloads = Math.max(maxActiveDownloads, activeDownloads);

        await sleepForTest(5);

        activeDownloads -= 1;
        return {
          status: 'downloaded' as const,
          item,
          message: `${item.filename} baixado com sucesso.`,
        };
      });

      // Act
      const result = await executeCsvDownloader(args, {
        currentYear: 2026,
        downloadItem,
      });

      // Assert
      expect(result.exitCode).toBe(0);
      expect(downloadItem).toHaveBeenCalledTimes(7);
      expect(maxActiveDownloads).toBe(3);
    });

    it('continues after item failures and reports the final summary', async () => {
      // Arrange
      const args = ['--years=2025'];
      const output: string[] = [];
      const downloadItem = jest.fn((item: CsvDownloadPlanItem) => {
        if (item.filename === 'legislaturas.csv') {
          return Promise.resolve({
            status: 'failed' as const,
            item,
            message: `${item.filename}: 404 Not Found`,
          });
        }

        if (item.filename === 'deputados.csv') {
          return Promise.resolve({
            status: 'skipped' as const,
            item,
            message: `${item.filename} já existe, pulando.`,
          });
        }

        return Promise.resolve({
          status: 'downloaded' as const,
          item,
          message: `${item.filename} baixado com sucesso.`,
        });
      });

      // Act
      const result = await executeCsvDownloader(args, {
        currentYear: 2026,
        downloadItem,
        reporter: {
          log(message) {
            output.push(message);
          },
        },
      });

      // Assert
      expect(downloadItem).toHaveBeenCalledTimes(7);
      expect(result).toMatchObject({
        ok: true,
        exitCode: 1,
        summary: {
          downloaded: 5,
          skipped: 1,
          failed: 1,
          failures: [
            {
              filename: 'legislaturas.csv',
              reason: '404 Not Found',
            },
          ],
        },
      });
      expect(output).toEqual(
        expect.arrayContaining([
          '[deputados.csv] pulado',
          '[legislaturas.csv] falhou: 404 Not Found',
          'Resumo: 5 baixados, 1 pulados, 1 erros.',
          'Falhas:',
          '  - legislaturas.csv: 404 Not Found',
        ]),
      );
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

async function sleepForTest(durationMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
}
