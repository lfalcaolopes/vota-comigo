import { toFiltroAtivo, type FiltroAtivo } from "@/shared/ui";

import { toEstadoLabel } from "./presentation";

export type DeputadoFeedFiltros = {
  emAtividade: boolean;
  uf: string | null;
  partido: string | null;
};

export type DeputadoFiltroId = keyof DeputadoFeedFiltros;

export type DeputadoFiltroAtivo = FiltroAtivo<DeputadoFiltroId>;

export const FILTROS_PADRAO: DeputadoFeedFiltros = {
  emAtividade: false,
  uf: null,
  partido: null,
};

export function descreverFiltrosAtivos(
  filtros: DeputadoFeedFiltros,
): readonly DeputadoFiltroAtivo[] {
  const ativos: DeputadoFiltroAtivo[] = [];

  if (filtros.emAtividade) {
    ativos.push(toFiltroAtivo("emAtividade", FILTRO_NOME.emAtividade));
  }
  if (filtros.uf !== null) {
    ativos.push(toFiltroAtivo("uf", FILTRO_NOME.uf, toEstadoLabel(filtros.uf)));
  }
  if (filtros.partido !== null) {
    ativos.push(toFiltroAtivo("partido", FILTRO_NOME.partido, filtros.partido));
  }

  return ativos;
}

// Deriva da mesma lista dos chips para que contador e chips não divirjam.
export function contarFiltrosAtivos(filtros: DeputadoFeedFiltros): number {
  return descreverFiltrosAtivos(filtros).length;
}

export function removerFiltro(
  filtros: DeputadoFeedFiltros,
  id: DeputadoFiltroId,
): DeputadoFeedFiltros {
  return { ...filtros, [id]: FILTROS_PADRAO[id] };
}

export function saoFiltrosIguais(
  a: DeputadoFeedFiltros,
  b: DeputadoFeedFiltros,
): boolean {
  return (
    a.emAtividade === b.emAtividade && a.uf === b.uf && a.partido === b.partido
  );
}

const FILTRO_NOME: Record<DeputadoFiltroId, string> = {
  emAtividade: "Em atividade",
  uf: "Estado",
  partido: "Partido",
};
