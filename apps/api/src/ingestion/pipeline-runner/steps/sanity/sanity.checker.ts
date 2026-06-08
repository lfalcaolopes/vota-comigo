import type { PlacarComparisonRow } from './sanity.repository.types';

export type PlacarDivergence = {
  externalIdVotacao: string;
  votosSimOficial: number;
  votosSimDerivado: number;
  votosNaoOficial: number;
  votosNaoDerivado: number;
};

export type PlacarSemVotos = {
  externalIdVotacao: string;
  votosSimOficial: number;
  votosNaoOficial: number;
  votosNaoInformadoDerivado: number;
};

export type PlacarComparison =
  | { status: 'ok' }
  // Sem placar oficial não há o que comparar; a votação não é divergente.
  | { status: 'incomparavel' }
  // Placar oficial tem votos, mas a fonte não traz direção individual: todos os
  // votos vieram em branco (nao_informado). É lacuna da fonte, não divergência.
  | { status: 'votos_ausentes'; semVotos: PlacarSemVotos }
  | { status: 'divergente'; divergence: PlacarDivergence };

export function comparePlacar(row: PlacarComparisonRow): PlacarComparison {
  if (row.votosSimOficial === null || row.votosNaoOficial === null) {
    return { status: 'incomparavel' };
  }

  if (
    row.votosSimOficial === row.votosSimDerivado &&
    row.votosNaoOficial === row.votosNaoDerivado
  ) {
    return { status: 'ok' };
  }

  const { abstencao, obstrucao, artigo17, naoInformado } = row.outrosDerivado;
  const semDirecaoIndividual =
    row.votosSimDerivado === 0 &&
    row.votosNaoDerivado === 0 &&
    abstencao === 0 &&
    obstrucao === 0 &&
    artigo17 === 0 &&
    naoInformado > 0;
  const oficialTemVotos = row.votosSimOficial > 0 || row.votosNaoOficial > 0;

  if (semDirecaoIndividual && oficialTemVotos) {
    return {
      status: 'votos_ausentes',
      semVotos: {
        externalIdVotacao: row.externalIdVotacao,
        votosSimOficial: row.votosSimOficial,
        votosNaoOficial: row.votosNaoOficial,
        votosNaoInformadoDerivado: naoInformado,
      },
    };
  }

  return {
    status: 'divergente',
    divergence: {
      externalIdVotacao: row.externalIdVotacao,
      votosSimOficial: row.votosSimOficial,
      votosSimDerivado: row.votosSimDerivado,
      votosNaoOficial: row.votosNaoOficial,
      votosNaoDerivado: row.votosNaoDerivado,
    },
  };
}
