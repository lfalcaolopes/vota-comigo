import type {
  ProposicaoCard,
  VotacaoReferenciaResumo,
} from '@vota-comigo/shared-types';

import { interpretResultado } from '@/matcher/rules/votacao-referencia';

import type {
  ProposicaoFeedItem,
  VotacaoReferenciaResumoSource,
} from '../types/proposicoes.types';
import { toResumoIaCardFields } from '../rules/proposicao-resumo-ia-public';

export function toProposicaoCard(item: ProposicaoFeedItem): ProposicaoCard {
  const { proposicao } = item;
  const resumoIa = toResumoIaCardFields(item.resumoIa);
  return {
    externalIdProposicao: proposicao.externalIdProposicao,
    siglaTipo: proposicao.siglaTipo,
    numero: proposicao.numero,
    ano: proposicao.ano,
    ementa: proposicao.ementa,
    resumoIaDisponivel: resumoIa.resumoIaDisponivel,
    resumoIaCard: resumoIa.resumoIaCard,
    dataApresentacao: proposicao.dataApresentacao,
    volumeVotacoesPlenario: item.volumeVotacoesPlenario,
    dataUltimaVotacao: item.dataUltimaVotacao,
  };
}

export function toVotacaoReferenciaResumo(
  referencia: VotacaoReferenciaResumoSource,
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
