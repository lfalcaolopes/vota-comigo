import type {
  ClassifiedVotacao,
  VotacaoCandidate,
} from '@/matcher/votacao-referencia';

export type ProposicaoWithVotacoes = {
  externalIdProposicao: number;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  ultimoStatusSiglaOrgao: string | null;
  ultimoStatusDescricaoSituacao: string | null;
  ultimoStatusRegime: string | null;
  ultimoStatusDataHora: string | null;
  votacoesPlenario: readonly VotacaoCandidate[];
};

export type RankedProposicao = {
  proposicao: ProposicaoWithVotacoes;
  volumeVotacoesPlenario: number;
  referencia: ClassifiedVotacao;
};
