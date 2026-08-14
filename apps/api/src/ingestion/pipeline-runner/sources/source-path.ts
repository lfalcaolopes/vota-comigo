import { csvDatasetStrategies } from '@/ingestion/camara-csv-downloader/plan/csv-dataset-strategy';

import type { IngestionPlanEntry } from '../types/ingestion-pipeline-runner.types';

export function defaultSourcePath(entry: IngestionPlanEntry): string {
  const dataset = entry.dataset ?? entry.stepName;
  const strategy = csvDatasetStrategies.find(
    (candidate) => candidate.dataset === dataset,
  );

  // O downloader é dono de onde cada conjunto cai no disco; o pipeline lê do
  // mesmo lugar em vez de repetir a convenção de nome.
  if (strategy !== undefined) {
    return strategy.buildItem({
      baseUrl: '',
      year: entry.year,
      legislatura: entry.legislatura,
    }).localPath;
  }

  if (entry.scope === 'single') {
    return `data/raw/${dataset}/${dataset}.csv`;
  }

  return `data/raw/${dataset}/${dataset}-${entry.year}.csv`;
}
