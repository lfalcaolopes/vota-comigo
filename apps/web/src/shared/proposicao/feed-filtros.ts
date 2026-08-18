import type { FeedOrdenacao, TemaDisponivel } from "@vota-comigo/shared-types";

import { toFiltroAtivo, type FiltroAtivo } from "@/shared/ui";

export type ProposicaoFeedFiltros = {
  ordenacao: FeedOrdenacao;
  tema: number | null;
};

export type ProposicaoFiltroId = keyof ProposicaoFeedFiltros;

export type ProposicaoFiltroAtivo = FiltroAtivo<ProposicaoFiltroId>;

export const ORDENACAO_LABEL: Record<FeedOrdenacao, string> = {
  "mais-votadas": "Mais votadas",
  "mais-recentes": "Mais recentes",
};

export const FILTROS_PADRAO: ProposicaoFeedFiltros = {
  ordenacao: "mais-votadas",
  tema: null,
};

export function toTemaLabel(
  tema: number | null,
  temas: readonly TemaDisponivel[],
): string | null {
  if (tema === null) return null;
  return temas.find((item) => item.externalCodTema === tema)?.tema ?? null;
}

export function descreverFiltrosAtivos(
  filtros: ProposicaoFeedFiltros,
  temas: readonly TemaDisponivel[],
): readonly ProposicaoFiltroAtivo[] {
  const ativos: ProposicaoFiltroAtivo[] = [];

  if (filtros.ordenacao !== FILTROS_PADRAO.ordenacao) {
    ativos.push(
      toFiltroAtivo(
        "ordenacao",
        "Ordenação",
        ORDENACAO_LABEL[filtros.ordenacao],
      ),
    );
  }
  if (filtros.tema !== null) {
    ativos.push(
      toFiltroAtivo("tema", "Tema", toTemaLabel(filtros.tema, temas)),
    );
  }

  return ativos;
}

// Deriva da mesma lista dos chips para que contador e chips não divirjam.
export function contarFiltrosAtivos(
  filtros: ProposicaoFeedFiltros,
  temas: readonly TemaDisponivel[],
): number {
  return descreverFiltrosAtivos(filtros, temas).length;
}

export function removerFiltro(
  filtros: ProposicaoFeedFiltros,
  id: ProposicaoFiltroId,
): ProposicaoFeedFiltros {
  return { ...filtros, [id]: FILTROS_PADRAO[id] };
}

export function saoFiltrosIguais(
  a: ProposicaoFeedFiltros,
  b: ProposicaoFeedFiltros,
): boolean {
  return a.ordenacao === b.ordenacao && a.tema === b.tema;
}
