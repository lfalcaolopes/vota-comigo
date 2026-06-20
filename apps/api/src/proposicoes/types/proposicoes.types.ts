import type {
  ProposicaoResumoIaGenerationStatus,
  ProposicaoResumoIaReviewStatus,
  VotacaoReferenciaPattern,
} from '@vota-comigo/shared-types';
import type { VotacaoCandidate } from '@/matcher/rules/votacao-referencia';

export type ProposicaoResumoIaProjection = {
  sourceHash: string;
  generationStatus: ProposicaoResumoIaGenerationStatus;
  reviewStatus: ProposicaoResumoIaReviewStatus;
  resumoCard: string | null;
  resumoDetalhe: string | null;
};

export type ProposicaoResumo = {
  externalIdProposicao: number;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  descricaoTipo: string | null;
  ementaDetalhada: string | null;
  keywords: string | null;
  urlInteiroTeor: string | null;
  dataApresentacao: string | null;
  ultimoStatusSiglaOrgao: string | null;
  ultimoStatusDescricaoSituacao: string | null;
  ultimoStatusRegime: string | null;
  ultimoStatusDataHora: string | null;
};

export type ProposicaoWithVotacoes = ProposicaoResumo & {
  resumoIa: ProposicaoResumoIaProjection | null;
  votacoesPlenario: readonly VotacaoCandidate[];
};

export type VotacaoReferenciaComputavel = VotacaoCandidate & {
  classification: {
    pattern: VotacaoReferenciaPattern;
  };
};

export type RankedProposicao = {
  proposicao: ProposicaoResumo;
  resumoIa: ProposicaoResumoIaProjection | null;
  volumeVotacoesPlenario: number;
  dataUltimaVotacao: string | null;
  referencia: VotacaoReferenciaComputavel;
};

export type ProposicaoTemaRow = {
  externalIdProposicao: number;
  externalCodTema: number;
  tema: string | null;
};
