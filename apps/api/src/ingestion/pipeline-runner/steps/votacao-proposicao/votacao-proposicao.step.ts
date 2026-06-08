import type {
  ExternalGap,
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';
import { normalizeVotacaoProposicaoRecord } from '../../shared/votacoes-proposicoes.normalizer';
import { StrictModeError } from '../../errors/strict-mode-error';
import type {
  ProposicaoLookup,
  VotacaoLookup,
  VotacaoProposicaoRepository,
  VotacaoProposicaoRow,
} from './votacao-proposicao.repository.types';

const LINK_DATASET = 'votacoesProposicoes';

export type VotacaoProposicaoStepDeps = {
  repository: VotacaoProposicaoRepository;
  votacaoLookup: VotacaoLookup;
  proposicaoLookup: ProposicaoLookup;
};

export function createVotacaoProposicaoStep(
  deps: VotacaoProposicaoStepDeps,
): IngestionStep {
  return {
    name: 'votacao_proposicao',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const readDataset = context.readDataset;

      if (readDataset === undefined) {
        throw new Error(
          'Passo votacao_proposicao requer readDataset no contexto de execução.',
        );
      }

      const votacaoIds = await deps.votacaoLookup.loadIdByExternalId();
      const proposicaoIds = await deps.proposicaoLookup.loadIdByExternalId();

      const rows: VotacaoProposicaoRow[] = [];
      const externalGaps: ExternalGap[] = [];
      let ignored = 0;

      for (const year of context.years ?? []) {
        const links = readDataset(LINK_DATASET, year);

        if (links === undefined) {
          const gap = missingFileGap(year);

          if (context.strict && !context.dryRun) {
            throw StrictModeError.fromGap(gap);
          }

          externalGaps.push(gap);
          continue;
        }

        context.reporter?.log(
          `[votacao_proposicao] lendo ${LINK_DATASET}-${year}.csv`,
        );

        for await (const { record } of links()) {
          const { idVotacao, proposicaoId } =
            normalizeVotacaoProposicaoRecord(record);

          if (idVotacao === null || proposicaoId === null) {
            ignored += 1;
            continue;
          }

          const votacaoId = votacaoIds.get(idVotacao);

          if (votacaoId === undefined) {
            ignored += 1;
            continue;
          }

          rows.push({
            externalIdVotacao: idVotacao,
            externalIdProposicao: proposicaoId,
            votacaoId,
            proposicaoId: proposicaoIds.get(proposicaoId) ?? null,
          });
        }
      }

      const { inserted, updated } = context.dryRun
        ? { inserted: 0, updated: 0 }
        : await deps.repository.upsert(rows);

      return {
        read: rows.length,
        inserted,
        updated,
        ignored,
        rejected: [],
        externalGaps,
      };
    },
  };
}

function missingFileGap(year: number): ExternalGap {
  return {
    file: `${LINK_DATASET}-${year}.csv`,
    type: 'fonte_ausente',
    reference: `${LINK_DATASET}-${year}`,
    message: `${LINK_DATASET}-${year}.csv ausente; nenhum vínculo votação-proposição foi importado para ${year}.`,
  };
}
