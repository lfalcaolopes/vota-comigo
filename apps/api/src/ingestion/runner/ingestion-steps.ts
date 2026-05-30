import {
  createDatabaseClient,
  type DatabaseClient,
} from '@/shared/database/client';
import { createLegislaturaRepository } from './steps/legislaturas.repository';
import { createLegislaturasStep } from './steps/legislaturas.step';
import type { LegislaturaRepository } from './steps/legislaturas.repository.types';
import {
  createDeputadoRepository,
  createLegislaturaLookup,
} from './steps/deputados.repository';
import { createDeputadosStep } from './steps/deputados.step';
import type {
  DeputadoRepository,
  LegislaturaLookup,
} from './steps/deputados.repository.types';
import { createPartidoRepository } from './steps/partidos.repository';
import { createPartidosStep } from './steps/partidos.step';
import type { PartidoRepository } from './steps/partidos.repository.types';
import type {
  CreateStepsInput,
  CreateStepsResult,
  IngestionStep,
} from './ingestion-runner.types';

export type IngestionStepsOptions = {
  databaseClientFactory?: (url?: string) => DatabaseClient;
};

const dryRunLegislaturaRepository: LegislaturaRepository = {
  upsert: dryRunWriteGuard,
};

const dryRunDeputadoRepository: DeputadoRepository = {
  upsert: dryRunWriteGuard,
};

const dryRunPartidoRepository: PartidoRepository = {
  upsert: dryRunWriteGuard,
};

const dryRunLegislaturaLookup: LegislaturaLookup = {
  loadIdByExternalId(): Promise<never> {
    throw new Error(
      'Lookup de legislatura acionado em dry-run. Nenhuma resolução de FK deveria ocorrer.',
    );
  },
};

export function createIngestionSteps(
  input: CreateStepsInput,
  options: IngestionStepsOptions = {},
): Promise<CreateStepsResult> {
  if (input.dryRun) {
    return Promise.resolve({
      steps: [
        createLegislaturasStep(dryRunLegislaturaRepository),
        createDeputadosStep(dryRunDeputadoRepository, dryRunLegislaturaLookup),
        createPartidosStep(dryRunPartidoRepository),
      ],
      close: () => Promise.resolve(),
    });
  }

  const factory = options.databaseClientFactory ?? createDatabaseClient;
  const { db, close } = factory();

  const steps: IngestionStep[] = [
    createLegislaturasStep(createLegislaturaRepository(db)),
    createDeputadosStep(
      createDeputadoRepository(db),
      createLegislaturaLookup(db),
    ),
    createPartidosStep(createPartidoRepository(db)),
  ];

  return Promise.resolve({ steps, close });
}

function dryRunWriteGuard(): Promise<never> {
  throw new Error(
    'Repositório de escrita acionado em dry-run. Nenhuma gravação deveria ocorrer.',
  );
}
