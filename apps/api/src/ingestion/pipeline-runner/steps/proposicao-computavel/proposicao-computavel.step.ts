import { selectVotacaoReferencia } from '@/matcher/rules/votacao-referencia';
import type {
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';
import type {
  ProposicaoComputavelCandidateRow,
  ProposicaoComputavelRepository,
  ProposicaoComputavelRow,
} from './proposicao-computavel.repository.types';

export const PROPOSICAO_COMPUTAVEL_RULE_VERSION = 1;

export function createProposicaoComputavelStep(
  repository: ProposicaoComputavelRepository,
): IngestionStep {
  return {
    name: 'proposicao_computavel',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const candidates = await repository.loadCandidates();
      const rows = toProposicaoComputavelRows(candidates);

      context.reporter?.log(
        `[proposicao_computavel] ${rows.length} proposição(ões) computável(eis) de ${countProposicoes(candidates)} proposição(ões) com votação em plenário`,
      );

      const refresh = context.dryRun
        ? { inserted: 0 }
        : await repository.fullReplace(rows);

      return {
        read: candidates.length,
        inserted: refresh.inserted,
        updated: 0,
        ignored: countProposicoes(candidates) - rows.length,
        rejected: [],
        externalGaps: [],
      };
    },
  };
}

function toProposicaoComputavelRows(
  candidates: readonly ProposicaoComputavelCandidateRow[],
): readonly ProposicaoComputavelRow[] {
  const byProposicao = groupByProposicao(candidates);

  return [...byProposicao.entries()].flatMap(([proposicaoId, votacoes]) => {
    const referencia = selectVotacaoReferencia(votacoes);
    if (referencia === null) {
      return [];
    }

    const referenciaRow = votacoes.find(
      (votacao) => votacao.externalIdVotacao === referencia.externalIdVotacao,
    );
    if (referenciaRow === undefined) {
      return [];
    }

    return [
      {
        proposicaoId,
        votacaoReferenciaId: referenciaRow.votacaoId,
        votacaoReferenciaPattern: referencia.classification.pattern,
        volumeVotacoesPlenario: votacoes.length,
        dataUltimaVotacao: maxDate(votacoes.map((votacao) => votacao.data)),
        ruleVersion: PROPOSICAO_COMPUTAVEL_RULE_VERSION,
      },
    ];
  });
}

function groupByProposicao(
  candidates: readonly ProposicaoComputavelCandidateRow[],
): ReadonlyMap<string, readonly ProposicaoComputavelCandidateRow[]> {
  const byProposicao = new Map<string, ProposicaoComputavelCandidateRow[]>();

  for (const candidate of candidates) {
    const existing = byProposicao.get(candidate.proposicaoId);
    if (existing === undefined) {
      byProposicao.set(candidate.proposicaoId, [candidate]);
    } else {
      existing.push(candidate);
    }
  }

  return byProposicao;
}

function countProposicoes(
  candidates: readonly ProposicaoComputavelCandidateRow[],
): number {
  return new Set(candidates.map((candidate) => candidate.proposicaoId)).size;
}

function maxDate(values: readonly (string | null)[]): string | null {
  return values.reduce<string | null>((max, value) => {
    if (value === null) {
      return max;
    }
    return max === null || value > max ? value : max;
  }, null);
}
