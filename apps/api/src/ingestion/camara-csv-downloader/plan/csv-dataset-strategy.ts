import type { CsvDownloadPlanItem } from '../types/csv-downloader.types';

export type CsvDatasetStrategy = {
  dataset: string;
  scope: 'single-file' | 'annual';
  firstYear: number;
  // Conjuntos opt-in ficam fora do plano padrão e só entram quando pedidos.
  optIn: boolean;
  buildItem(input: CsvDatasetItemInput): CsvDownloadPlanItem;
  yearFloorMessage?(year: number): string;
};

export type CsvDatasetItemInput = {
  baseUrl: string;
  year?: number;
};

const dadosAbertosFirstYear = 2001;
const cotaFirstYear = 2008;
const cotaBaseUrl = 'https://www.camara.leg.br/cotas';

const dadosAbertosAnnualDatasets = [
  'votacoes',
  'votacoesVotos',
  'votacoesProposicoes',
  'proposicoes',
  'proposicoesTemas',
] as const;

const dadosAbertosSingleFileDatasets = ['deputados', 'legislaturas'] as const;

// Proposições e seus temas legítimos existem antes de 2001 (ex.: 1991,
// 1997-2000), então o piso não se aplica a eles (ADR 0012).
const preCsvFloorDatasets = new Set(['proposicoes', 'proposicoesTemas']);

export const csvDatasetStrategies: readonly CsvDatasetStrategy[] = [
  ...dadosAbertosSingleFileDatasets.map((dataset) =>
    dadosAbertosStrategy(dataset, 'single-file'),
  ),
  ...dadosAbertosAnnualDatasets.map((dataset) =>
    dadosAbertosStrategy(dataset, 'annual'),
  ),
  {
    dataset: 'ceap',
    scope: 'annual',
    firstYear: cotaFirstYear,
    optIn: true,
    buildItem({ year }) {
      const filename = `Ano-${year}.csv`;

      return {
        dataset: 'ceap',
        filename,
        url: `${cotaBaseUrl}/${filename}.zip`,
        localPath: `data/raw/ceap/${filename}`,
        archive: { entryName: filename },
      };
    },
    yearFloorMessage(year) {
      return `Ano ${year} inválido para o conjunto ceap. Os arquivos da cota parlamentar existem a partir de ${cotaFirstYear}.`;
    },
  },
];

export function selectCsvDatasetStrategies(
  datasets?: readonly string[],
): readonly CsvDatasetStrategy[] {
  return csvDatasetStrategies.filter((strategy) =>
    datasets === undefined
      ? !strategy.optIn
      : datasets.includes(strategy.dataset),
  );
}

function dadosAbertosStrategy(
  dataset: string,
  scope: 'single-file' | 'annual',
): CsvDatasetStrategy {
  return {
    dataset,
    scope,
    firstYear: preCsvFloorDatasets.has(dataset) ? 0 : dadosAbertosFirstYear,
    optIn: false,
    buildItem({ baseUrl, year }) {
      const filename =
        scope === 'annual' ? `${dataset}-${year}.csv` : `${dataset}.csv`;

      return {
        dataset,
        filename,
        url: `${baseUrl}/${dataset}/csv/${filename}`,
        localPath: `data/raw/${dataset}/${filename}`,
      };
    },
  };
}
