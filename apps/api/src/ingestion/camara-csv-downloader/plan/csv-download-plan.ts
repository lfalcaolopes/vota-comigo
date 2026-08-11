import { selectCsvDatasetStrategies } from './csv-dataset-strategy';
import type {
  CsvDownloadPlanItem,
  CsvDownloaderConfig,
  CsvDownloaderOptions,
} from '../types/csv-downloader.types';

const defaultBaseUrl = 'https://dadosabertos.camara.leg.br/arquivos';

export function buildCsvDownloadPlan(
  config: CsvDownloaderConfig,
  options: Pick<CsvDownloaderOptions, 'baseUrl'> = {},
): CsvDownloadPlanItem[] {
  const baseUrl = removeTrailingSlash(options.baseUrl ?? defaultBaseUrl);
  const selected = selectCsvDatasetStrategies(config.datasets);

  const singleFileItems = selected
    .filter((strategy) => strategy.scope === 'single-file')
    .map((strategy) => strategy.buildItem({ baseUrl }));
  const annualItems = config.years.flatMap((year) =>
    selected
      .filter((strategy) => strategy.scope === 'annual')
      .map((strategy) => strategy.buildItem({ baseUrl, year })),
  );

  return [...singleFileItems, ...annualItems];
}

function removeTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}
