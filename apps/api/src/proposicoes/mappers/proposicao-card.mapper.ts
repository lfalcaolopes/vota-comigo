import type {
  ProposicaoCard,
  VotacaoReferenciaResumo,
} from '@vota-comigo/shared-types';

import {
  interpretResultado,
  type ClassifiedVotacao,
} from '@/matcher/rules/votacao-referencia';

import type { RankedProposicao } from '../types/proposicoes.types';

function maxDate(values: readonly (string | null)[]): string | null {
  return values.reduce<string | null>((max, value) => {
    if (value === null) {
      return max;
    }
    return max === null || value > max ? value : max;
  }, null);
}

export function toProposicaoCard(ranked: RankedProposicao): ProposicaoCard {
  const { proposicao } = ranked;
  return {
    externalIdProposicao: proposicao.externalIdProposicao,
    siglaTipo: proposicao.siglaTipo,
    numero: proposicao.numero,
    ano: proposicao.ano,
    ementa: proposicao.ementa,
    dataApresentacao: proposicao.dataApresentacao,
    volumeVotacoesPlenario: ranked.volumeVotacoesPlenario,
    dataUltimaVotacao: maxDate(
      proposicao.votacoesPlenario.map((votacao) => votacao.data),
    ),
  };
}

export function toVotacaoReferenciaResumo(
  referencia: ClassifiedVotacao,
): VotacaoReferenciaResumo {
  return {
    externalIdVotacao: referencia.externalIdVotacao,
    data: referencia.data,
    descricao: referencia.descricao,
    pattern: referencia.classification.pattern,
    votosSim: referencia.votosSim ?? 0,
    votosNao: referencia.votosNao ?? 0,
    votosOutros: referencia.votosOutros ?? 0,
    resultado: interpretResultado(referencia.aprovacao),
  };
}
