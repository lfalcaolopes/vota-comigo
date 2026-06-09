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
