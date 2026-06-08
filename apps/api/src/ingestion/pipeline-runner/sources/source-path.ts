import type { IngestionPlanEntry } from '../types/ingestion-pipeline-runner.types';

export function defaultSourcePath(entry: IngestionPlanEntry): string {
  const dataset = entry.dataset ?? entry.stepName;

  if (entry.scope === 'single') {
    return `data/raw/${dataset}/${dataset}.csv`;
  }

  return `data/raw/${dataset}/${dataset}-${entry.year}.csv`;
}
