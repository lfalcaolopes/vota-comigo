import {
  createDatabaseClient,
  type DatabaseClient,
} from '@/shared/database/client';
import { createLegislaturaRepository } from './steps/legislaturas.repository';
import { createLegislaturasStep } from './steps/legislaturas.step';
import type { LegislaturaRepository } from './steps/legislaturas.repository.types';
import type {
  CreateStepsInput,
  CreateStepsResult,
} from './ingestion-runner.types';

export type IngestionStepsOptions = {
  databaseClientFactory?: (url?: string) => DatabaseClient;
};

const dryRunLegislaturaRepository: LegislaturaRepository = {
  upsert(): Promise<never> {
    throw new Error(
      'Repositório de escrita acionado em dry-run. Nenhuma gravação deveria ocorrer.',
    );
  },
};

export function createIngestionSteps(
  input: CreateStepsInput,
  options: IngestionStepsOptions = {},
): Promise<CreateStepsResult> {
  if (input.dryRun) {
    return Promise.resolve({
      steps: [createLegislaturasStep(dryRunLegislaturaRepository)],
      close: () => Promise.resolve(),
    });
  }

  const factory = options.databaseClientFactory ?? createDatabaseClient;
  const { db, close } = factory();

  return Promise.resolve({
    steps: [createLegislaturaStepWith(db)],
    close,
  });
}

function createLegislaturaStepWith(
  db: DatabaseClient['db'],
): ReturnType<typeof createLegislaturasStep> {
  return createLegislaturasStep(createLegislaturaRepository(db));
}
