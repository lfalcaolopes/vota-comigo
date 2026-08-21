import type { SiglaUf } from '@vota-comigo/shared-types';

import type { DeputadoResumoComputado } from '../types/compatibilidade.types';

function compareNome(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

export function compareRanking(
  a: DeputadoResumoComputado,
  b: DeputadoResumoComputado,
  siglaUfPrioritaria?: SiglaUf,
): number {
  if (a.scoreOrdenacaoPercentual !== b.scoreOrdenacaoPercentual) {
    return b.scoreOrdenacaoPercentual - a.scoreOrdenacaoPercentual;
  }
  if (a.compatibilidadeBruta !== b.compatibilidadeBruta) {
    return b.compatibilidadeBruta - a.compatibilidadeBruta;
  }
  if (siglaUfPrioritaria !== undefined) {
    const aPrioritaria = a.siglaUf === siglaUfPrioritaria;
    const bPrioritaria = b.siglaUf === siglaUfPrioritaria;
    if (aPrioritaria !== bPrioritaria) {
      return aPrioritaria ? -1 : 1;
    }
  }
  if (a.coberturaExercicio !== b.coberturaExercicio) {
    return b.coberturaExercicio - a.coberturaExercicio;
  }
  if (a.emAtividade !== b.emAtividade) {
    return a.emAtividade ? -1 : 1;
  }
  const porNome = compareNome(a.nome, b.nome);
  if (porNome !== 0) {
    return porNome;
  }
  return a.externalIdDeputado - b.externalIdDeputado;
}

export function sortRanking(
  deputados: readonly DeputadoResumoComputado[],
  siglaUfPrioritaria?: SiglaUf,
): DeputadoResumoComputado[] {
  return [...deputados].sort((a, b) =>
    compareRanking(a, b, siglaUfPrioritaria),
  );
}

export function sortRankingByUsoCota(
  deputados: readonly DeputadoResumoComputado[],
  siglaUfPrioritaria?: SiglaUf,
): DeputadoResumoComputado[] {
  const rankingNormal = sortRanking(deputados, siglaUfPrioritaria);
  const posicaoNormal = new Map(
    rankingNormal.map((deputado, index) => [
      deputado.externalIdDeputado,
      index,
    ]),
  );
  return [...deputados].sort((a, b) => {
    const calculavelA = a.usoCota?.status === 'calculavel';
    const calculavelB = b.usoCota?.status === 'calculavel';
    if (calculavelA !== calculavelB) return calculavelA ? -1 : 1;
    if (calculavelA && calculavelB) {
      const percentualA =
        a.usoCota!.status === 'calculavel' ? a.usoCota!.percentualTetoBase : 0;
      const percentualB =
        b.usoCota!.status === 'calculavel' ? b.usoCota!.percentualTetoBase : 0;
      if (percentualA !== percentualB) return percentualA - percentualB;
      const nomeA = a.nomeEleitoral ?? a.nome ?? a.nomeCivil;
      const nomeB = b.nomeEleitoral ?? b.nome ?? b.nomeCivil;
      const porNome = compareNome(nomeA, nomeB);
      if (porNome !== 0) return porNome;
      return a.externalIdDeputado - b.externalIdDeputado;
    }
    return (
      posicaoNormal.get(a.externalIdDeputado)! -
      posicaoNormal.get(b.externalIdDeputado)!
    );
  });
}
