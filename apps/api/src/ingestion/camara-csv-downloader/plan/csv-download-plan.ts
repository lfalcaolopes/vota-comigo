import type {
  CsvDownloadPlanItem,
  CsvDownloaderConfig,
  CsvDownloaderOptions,
} from '../types/csv-downloader.types';

const defaultBaseUrl = 'https://dadosabertos.camara.leg.br/arquivos';

const annualDatasets = [
  'votacoes',
  'votacoesVotos',
  'votacoesProposicoes',
  'proposicoes',
  'proposicoesTemas',
] as const;

const singleFileDatasets = ['deputados', 'legislaturas'] as const;

export function buildCsvDownloadPlan(
  config: CsvDownloaderConfig,
  options: Pick<CsvDownloaderOptions, 'baseUrl'> = {},
): CsvDownloadPlanItem[] {
  const baseUrl = removeTrailingSlash(options.baseUrl ?? defaultBaseUrl);
  const wanted = config.datasets;
  const includes = (dataset: string): boolean =>
    wanted === undefined || wanted.includes(dataset);

  const singleFileItems = singleFileDatasets
    .filter(includes)
    .map((dataset) => planItem(dataset, `${dataset}.csv`, baseUrl));
  const annualItems = config.years.flatMap((year) =>
    annualDatasets
      .filter(includes)
      .map((dataset) => planItem(dataset, `${dataset}-${year}.csv`, baseUrl)),
  );

  return [...singleFileItems, ...annualItems];
}

function planItem(
  dataset: string,
  filename: string,
  baseUrl: string,
): CsvDownloadPlanItem {
  return {
    dataset,
    filename,
    url: `${baseUrl}/${dataset}/csv/${filename}`,
    localPath: `data/raw/${dataset}/${filename}`,
  };
}

function removeTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}
