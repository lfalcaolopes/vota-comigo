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
