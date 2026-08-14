import type { IngestionStepRunRow } from './ingestion-step-run';

export type IngestionStepRunRepository = {
  upsert(rows: readonly IngestionStepRunRow[]): Promise<void>;
};
