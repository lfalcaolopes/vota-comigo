import type { FeedOrdenacao } from '@vota-comigo/shared-types';

import type { RankedProposicao } from '../types/proposicoes.types';

function compareTieBreak(a: RankedProposicao, b: RankedProposicao): number {
  const anoA = a.proposicao.ano ?? Number.NEGATIVE_INFINITY;
  const anoB = b.proposicao.ano ?? Number.NEGATIVE_INFINITY;
  if (anoA !== anoB) return anoB - anoA;

  const numeroA = a.proposicao.numero ?? Number.NEGATIVE_INFINITY;
  const numeroB = b.proposicao.numero ?? Number.NEGATIVE_INFINITY;
  if (numeroA !== numeroB) return numeroB - numeroA;

  const siglaA = a.proposicao.siglaTipo ?? '';
  const siglaB = b.proposicao.siglaTipo ?? '';
  if (siglaA !== siglaB) return siglaA < siglaB ? -1 : 1;

  return a.proposicao.externalIdProposicao - b.proposicao.externalIdProposicao;
}

export function compareRanking(
  a: RankedProposicao,
  b: RankedProposicao,
): number {
  if (a.volumeVotacoesPlenario !== b.volumeVotacoesPlenario) {
    return b.volumeVotacoesPlenario - a.volumeVotacoesPlenario;
  }
  return compareTieBreak(a, b);
}

export function compareDataApresentacao(
  a: RankedProposicao,
  b: RankedProposicao,
): number {
  const dateA = a.proposicao.dataApresentacao;
  const dateB = b.proposicao.dataApresentacao;

  if (dateA === null && dateB === null) return compareTieBreak(a, b);
  if (dateA === null) return 1;
  if (dateB === null) return -1;
  if (dateA !== dateB) return dateA < dateB ? 1 : -1;

  return compareTieBreak(a, b);
}

export function selectComparator(
  ordenacao: FeedOrdenacao,
): (a: RankedProposicao, b: RankedProposicao) => number {
  if (ordenacao === 'mais-recentes') return compareDataApresentacao;
  return compareRanking;
}
