import { toFiltroAtivo, type FiltroAtivo } from "@/shared/ui";

export type ResultadoFiltros = {
  apenasEmAtividade: boolean;
  externalIdProposicoesFiltroConcordancia: readonly number[];
};

export type ResultadoFiltroId = "apenasEmAtividade" | "concordancia";

export type ResultadoFiltroAtivo = FiltroAtivo<ResultadoFiltroId>;

export const RESULTADO_FILTROS_PADRAO: ResultadoFiltros = {
  apenasEmAtividade: false,
  externalIdProposicoesFiltroConcordancia: [],
};

export function descreverResultadoFiltrosAtivos(
  filtros: ResultadoFiltros,
): readonly ResultadoFiltroAtivo[] {
  const ativos: ResultadoFiltroAtivo[] = [];
  const marcadas = filtros.externalIdProposicoesFiltroConcordancia.length;

  if (filtros.apenasEmAtividade) {
    ativos.push(toFiltroAtivo("apenasEmAtividade", "Apenas em atividade"));
  }
  if (marcadas > 0) {
    ativos.push(
      toFiltroAtivo(
        "concordancia",
        "Concordância",
        marcadas === 1 ? "1 proposição" : `${marcadas} proposições`,
      ),
    );
  }

  return ativos;
}

// Deriva da mesma lista dos chips para que contador e chips não divirjam.
export function contarResultadoFiltrosAtivos(
  filtros: ResultadoFiltros,
): number {
  return descreverResultadoFiltrosAtivos(filtros).length;
}

export function removerResultadoFiltro(
  filtros: ResultadoFiltros,
  id: ResultadoFiltroId,
): ResultadoFiltros {
  return id === "apenasEmAtividade"
    ? { ...filtros, apenasEmAtividade: false }
    : { ...filtros, externalIdProposicoesFiltroConcordancia: [] };
}

export function toggleResultadoFiltroConcordancia(
  filtros: ResultadoFiltros,
  externalIdProposicao: number,
): ResultadoFiltros {
  const marcadas = filtros.externalIdProposicoesFiltroConcordancia;
  return {
    ...filtros,
    externalIdProposicoesFiltroConcordancia: marcadas.includes(
      externalIdProposicao,
    )
      ? marcadas.filter((id) => id !== externalIdProposicao)
      : [...marcadas, externalIdProposicao],
  };
}

export function saoResultadoFiltrosIguais(
  a: ResultadoFiltros,
  b: ResultadoFiltros,
): boolean {
  return (
    a.apenasEmAtividade === b.apenasEmAtividade &&
    a.externalIdProposicoesFiltroConcordancia.length ===
      b.externalIdProposicoesFiltroConcordancia.length &&
    a.externalIdProposicoesFiltroConcordancia.every((externalIdProposicao) =>
      b.externalIdProposicoesFiltroConcordancia.includes(externalIdProposicao),
    )
  );
}
