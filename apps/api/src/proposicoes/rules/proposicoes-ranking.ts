import type { RankedProposicao } from '../types/proposicoes.types';

export function compareRanking(
  a: RankedProposicao,
  b: RankedProposicao,
): number {
  if (a.volumeVotacoesPlenario !== b.volumeVotacoesPlenario) {
    return b.volumeVotacoesPlenario - a.volumeVotacoesPlenario;
  }
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
