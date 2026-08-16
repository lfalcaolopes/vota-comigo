export type FiltroAtivo<Id extends string = string> = {
  id: Id;
  label: string;
  removeLabel: string;
};

export function toFiltroAtivo<Id extends string>(
  id: Id,
  nome: string,
  valor: string | null = null,
): FiltroAtivo<Id> {
  const label = valor === null ? nome : `${nome}: ${valor}`;
  return { id, label, removeLabel: `Remover filtro ${label}` };
}

export function toggleValor<Valor extends string>(
  selecionados: readonly Valor[],
  valor: Valor,
): readonly Valor[] {
  return selecionados.includes(valor)
    ? selecionados.filter((atual) => atual !== valor)
    : [...selecionados, valor];
}

// Selecionar SP e depois RJ é o mesmo filtro que o inverso, então a ordem dos
// cliques não pode habilitar o "Aplicar" nem contar como recorte novo.
export function saoSelecoesIguais(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

export function toSelecaoKey(selecionados: readonly string[]): string {
  return [...selecionados].sort().join(",");
}

export function descreverSelecao<Valor extends string>(
  selecionados: readonly Valor[],
  toLabel: (valor: Valor) => string,
  plural: string,
): string {
  return selecionados.length === 1
    ? toLabel(selecionados[0])
    : `${selecionados.length} ${plural}`;
}
