import type {
  CsvRowSource,
  ExternalGap,
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../ingestion-runner.types';
import { normalizeVotacaoVotoRecord } from '../../shared/votacoes-votos.normalizer';
import { StrictModeError } from '../../strict-mode-error';
import type {
  VotacaoRepository,
  VotacaoRow,
} from './votacoes.repository.types';
import { toVotacaoRow } from './votacoes.transformer';

const NOMINAL_INDEX_DATASET = 'votacoesVotos';

export function createVotacoesStep(
  repository: VotacaoRepository,
): IngestionStep {
  return {
    name: 'votacoes',
    scope: 'annual',
    companionDatasets: [NOMINAL_INDEX_DATASET],
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const companion = context.readCompanion?.(NOMINAL_INDEX_DATASET);

      if (companion === undefined) {
        return runWithoutNominalIndex(context);
      }

      const nominalIds = await collectNominalIds(companion);
      const votacoes = new Map<string, VotacaoRow>();
      let ignored = 0;

      for await (const { record } of context.readRecords()) {
        if (!nominalIds.has(record.id)) {
          ignored += 1;
          continue;
        }

        const row = toVotacaoRow(record);
        votacoes.set(row.externalIdVotacao, row);
      }

      const read = votacoes.size;
      const { inserted, updated } = context.dryRun
        ? { inserted: 0, updated: 0 }
        : await repository.upsert([...votacoes.values()]);

      return {
        read,
        inserted,
        updated,
        ignored,
        rejected: [],
        externalGaps: [],
      };
    },
  };
}

async function runWithoutNominalIndex(
  context: IngestionStepContext,
): Promise<StepRunResult> {
  const gap: ExternalGap = {
    file: context.sourceFile,
    type: 'fonte_ausente',
    reference: NOMINAL_INDEX_DATASET,
    message: `Índice de votos nominais (${NOMINAL_INDEX_DATASET}) ausente para ${context.sourceFile}; nenhuma votação foi importada.`,
  };

  if (context.strict) {
    throw StrictModeError.fromGap(gap);
  }

  let ignored = 0;

  for await (const row of context.readRecords()) {
    void row;
    ignored += 1;
  }

  return {
    read: 0,
    inserted: 0,
    updated: 0,
    ignored,
    rejected: [],
    externalGaps: [gap],
  };
}

async function collectNominalIds(
  companion: CsvRowSource,
): Promise<Set<string>> {
  const ids = new Set<string>();

  for await (const { record } of companion()) {
    const { idVotacao } = normalizeVotacaoVotoRecord(record);

    if (idVotacao !== null) {
      ids.add(idVotacao);
    }
  }

  return ids;
}
