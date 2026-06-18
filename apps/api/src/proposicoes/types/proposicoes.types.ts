import type { VotacaoReferenciaPattern } from '@vota-comigo/shared-types';
import type { VotacaoCandidate } from '@/matcher/rules/votacao-referencia';

export type ProposicaoResumo = {
  externalIdProposicao: number;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  dataApresentacao: string | null;
  ultimoStatusSiglaOrgao: string | null;
  ultimoStatusDescricaoSituacao: string | null;
  ultimoStatusRegime: string | null;
  ultimoStatusDataHora: string | null;
};

export type ProposicaoWithVotacoes = ProposicaoResumo & {
  votacoesPlenario: readonly VotacaoCandidate[];
};

export type VotacaoReferenciaComputavel = VotacaoCandidate & {
  classification: {
    pattern: VotacaoReferenciaPattern;
  };
};

export type RankedProposicao = {
  proposicao: ProposicaoResumo;
  volumeVotacoesPlenario: number;
  dataUltimaVotacao: string | null;
  referencia: VotacaoReferenciaComputavel;
};

export type ProposicaoTemaRow = {
  externalIdProposicao: number;
  externalCodTema: number;
  tema: string | null;
};
