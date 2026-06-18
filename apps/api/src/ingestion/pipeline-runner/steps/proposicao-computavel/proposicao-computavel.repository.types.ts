import type { VotacaoReferenciaPattern } from '@vota-comigo/shared-types';
import type { VotacaoCandidate } from '@/matcher/rules/votacao-referencia';

export type ProposicaoComputavelCandidateRow = VotacaoCandidate & {
  proposicaoId: string;
  votacaoId: string;
};

export type ProposicaoComputavelRow = {
  proposicaoId: string;
  votacaoReferenciaId: string;
  votacaoReferenciaPattern: VotacaoReferenciaPattern;
  volumeVotacoesPlenario: number;
  dataUltimaVotacao: string | null;
  ruleVersion: number;
};

export type ProposicaoComputavelRefreshResult = {
  inserted: number;
};

export type ProposicaoComputavelRepository = {
  loadCandidates(): Promise<readonly ProposicaoComputavelCandidateRow[]>;
  fullReplace(
    rows: readonly ProposicaoComputavelRow[],
  ): Promise<ProposicaoComputavelRefreshResult>;
};
