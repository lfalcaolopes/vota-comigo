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
): number {
  if (a.scoreOrdenacaoPercentual !== b.scoreOrdenacaoPercentual) {
    return b.scoreOrdenacaoPercentual - a.scoreOrdenacaoPercentual;
  }
  if (a.compatibilidadeBruta !== b.compatibilidadeBruta) {
    return b.compatibilidadeBruta - a.compatibilidadeBruta;
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
): DeputadoResumoComputado[] {
  return [...deputados].sort(compareRanking);
}
