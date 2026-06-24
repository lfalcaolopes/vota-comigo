import type {
  CsvDownloadPlanItem,
  CsvPlanItemDownloadResult,
} from '@/ingestion/camara-csv-downloader/types/csv-downloader.types';
import { createDatasetDownloader } from '../dataset-downloader';

function downloaded(item: CsvDownloadPlanItem): CsvPlanItemDownloadResult {
  return { status: 'downloaded', item, message: `${item.filename} baixado.` };
}

function skipped(item: CsvDownloadPlanItem): CsvPlanItemDownloadResult {
  return { status: 'skipped', item, message: `${item.filename} já existe.` };
}

function failed(
  item: CsvDownloadPlanItem,
  reason: string,
): CsvPlanItemDownloadResult {
  return { status: 'failed', item, message: `${item.filename}: ${reason}` };
}

function createReporter() {
  const logs: string[] = [];
  const statuses: string[] = [];
  const errors: string[] = [];

  return {
    logs,
    statuses,
    errors,
    log: (message: string) => logs.push(message),
    status: (message: string) => statuses.push(message),
    error: (message: string) => errors.push(message),
  };
}

describe('createDatasetDownloader', () => {
  describe('when downloading missing yearly files', () => {
    it('emits a live status line per file with its position in the batch', async () => {
      // Arrange
      const reporter = createReporter();
      const downloader = createDatasetDownloader('proposicoes', {
        downloadItem: async (item) => downloaded(item),
      });

      // Act
      await downloader.download([2015, 2016, 2017], { reporter });

      // Assert
      expect(reporter.statuses).toEqual([
        '[proposicoes] baixando proposicoes-2015.csv [1/3]',
        '[proposicoes] baixando proposicoes-2016.csv [2/3]',
        '[proposicoes] baixando proposicoes-2017.csv [3/3]',
      ]);
    });

    it('logs a final summary with download, skip and failure counts', async () => {
      // Arrange
      const reporter = createReporter();
      const downloader = createDatasetDownloader('proposicoes', {
        downloadItem: async (item) =>
          item.filename.includes('2016') ? skipped(item) : downloaded(item),
      });

      // Act
      const outcome = await downloader.download([2015, 2016], { reporter });

      // Assert
      expect(outcome).toEqual({ ok: true });
      expect(reporter.logs).toEqual([
        '[proposicoes] download concluído: 1 baixada(s), 1 pulada(s), 0 falha(s)',
      ]);
    });

    it('reports each failure as it happens and returns the failed years', async () => {
      // Arrange
      const reporter = createReporter();
      const downloader = createDatasetDownloader('proposicoes', {
        downloadItem: async (item) =>
          item.filename.includes('2016')
            ? failed(item, 'HTTP 503')
            : downloaded(item),
      });

      // Act
      const outcome = await downloader.download([2015, 2016], { reporter });

      // Assert
      expect(outcome).toEqual({
        ok: false,
        failures: [{ year: 2016, reason: 'proposicoes-2016.csv: HTTP 503' }],
      });
      expect(reporter.errors).toEqual([
        '[proposicoes] falha ao baixar proposicoes-2016.csv: proposicoes-2016.csv: HTTP 503',
      ]);
      expect(reporter.logs).toEqual([
        '[proposicoes] download concluído: 1 baixada(s), 0 pulada(s), 1 falha(s)',
      ]);
    });

    it('uses the provided label as the progress prefix', async () => {
      // Arrange
      const reporter = createReporter();
      const downloader = createDatasetDownloader('proposicoesTemas', {
        downloadItem: async (item) => downloaded(item),
      });

      // Act
      await downloader.download([2020], { reporter, label: '[tema]' });

      // Assert
      expect(reporter.statuses).toEqual([
        '[tema] baixando proposicoesTemas-2020.csv [1/1]',
      ]);
    });
  });
});
