import type {
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../ingestion-runner.types';
import { normalizeVotacaoVotoRecord } from '../../shared/votacoes-votos.normalizer';
import { StrictModeError } from '../../strict-mode-error';
import type { VotacaoLookup } from '../votacao-proposicao/votacao-proposicao.repository.types';
import type {
  DeputadoLookup,
  VotacaoVotosRepository,
} from './votacao-votos.repository.types';
import { transformVotacaoVotos } from './votacao-votos.transformer';

export type VotacaoVotosStepDeps = {
  repository: VotacaoVotosRepository;
  votacaoLookup: VotacaoLookup;
  deputadoLookup: DeputadoLookup;
};

export function createVotacaoVotosStep(
  deps: VotacaoVotosStepDeps,
): IngestionStep {
  return {
    name: 'votacao_votos',
    scope: 'annual',
    dataset: 'votacoesVotos',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const votacaoIds = await deps.votacaoLookup.loadIdByExternalId();
      const deputadoIds = await deps.deputadoLookup.loadIdByExternalId();

      const transformed = await transformVotacaoVotos({
        rows: normalizedRows(context),
        sourceFile: context.sourceFile,
        votacaoIds,
        deputadoIds,
      });

      if (context.strict && transformed.rejected.length > 0) {
        throw new StrictModeError(transformed.rejected[0]);
      }

      const { inserted, updated } = context.dryRun
        ? { inserted: 0, updated: 0 }
        : await deps.repository.upsert(transformed.rows);

      return {
        read: transformed.rows.length,
        inserted,
        updated,
        ignored: transformed.ignored,
        rejected: transformed.rejected,
        externalGaps: [],
      };
    },
  };
}

async function* normalizedRows(context: IngestionStepContext) {
  for await (const { lineNumber, record } of context.readRecords()) {
    yield {
      lineNumber,
      voto: normalizeVotacaoVotoRecord(record),
    };
  }
}
