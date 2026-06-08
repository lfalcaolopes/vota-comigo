import type { ProposicaoCard } from '@vota-comigo/shared-types';

import { interpretResultado } from '@/matcher/votacao-referencia';

import type { RankedProposicao } from '../types/proposicoes.types';

export function toProposicaoCard(ranked: RankedProposicao): ProposicaoCard {
  const { proposicao, referencia } = ranked;
  return {
    externalIdProposicao: proposicao.externalIdProposicao,
    siglaTipo: proposicao.siglaTipo,
    numero: proposicao.numero,
    ano: proposicao.ano,
    ementa: proposicao.ementa,
    status: {
      siglaOrgao: proposicao.ultimoStatusSiglaOrgao,
      situacao: proposicao.ultimoStatusDescricaoSituacao,
      regime: proposicao.ultimoStatusRegime,
      dataHora: proposicao.ultimoStatusDataHora,
    },
    volumeVotacoesPlenario: ranked.volumeVotacoesPlenario,
    votacaoReferencia: {
      externalIdVotacao: referencia.externalIdVotacao,
      data: referencia.data,
      descricao: referencia.descricao,
      pattern: referencia.classification.pattern,
      votosSim: referencia.votosSim ?? 0,
      votosNao: referencia.votosNao ?? 0,
      votosOutros: referencia.votosOutros ?? 0,
      resultado: interpretResultado(referencia.aprovacao),
    },
  };
}
