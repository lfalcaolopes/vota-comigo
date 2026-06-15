export function filtrarPorAtividade<T extends { emAtividade: boolean }>(
  deputados: readonly T[],
  apenasEmAtividade: boolean,
): readonly T[] {
  return apenasEmAtividade ? deputados.filter((d) => d.emAtividade) : deputados;
}
