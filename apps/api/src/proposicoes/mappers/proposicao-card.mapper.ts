import type {
  ProposicaoCard,
  VotacaoReferenciaResumo,
} from '@vota-comigo/shared-types';

import { interpretResultado } from '@/matcher/rules/votacao-referencia';

import type {
  RankedProposicao,
  VotacaoReferenciaComputavel,
} from '../types/proposicoes.types';
import { toResumoIaContractFields } from '../rules/proposicao-resumo-ia-public';

export function toProposicaoCard(ranked: RankedProposicao): ProposicaoCard {
  const { proposicao } = ranked;
  const resumoIa = toResumoIaContractFields(proposicao, ranked.resumoIa);
  return {
    externalIdProposicao: proposicao.externalIdProposicao,
    siglaTipo: proposicao.siglaTipo,
    numero: proposicao.numero,
    ano: proposicao.ano,
    ementa: proposicao.ementa,
    resumoIaDisponivel: resumoIa.resumoIaDisponivel,
    resumoIaCard: resumoIa.resumoIaCard,
    dataApresentacao: proposicao.dataApresentacao,
    volumeVotacoesPlenario: ranked.volumeVotacoesPlenario,
    dataUltimaVotacao: ranked.dataUltimaVotacao,
  };
}

export function toVotacaoReferenciaResumo(
  referencia: VotacaoReferenciaComputavel,
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
