import type { DeputadoSexo } from "@vota-comigo/shared-types";

import { toSexoLabel } from "@/shared/deputado";
import {
  descreverSelecao,
  toFiltroAtivo,
  toSelecaoKey,
  type FiltroAtivo,
} from "@/shared/ui";

// Os filtros que viajam no endereço (ADR 020) ficam separados porque a
// concordância é o único que não pode entrar na URL (ADR 021).
export type ResultadoFiltrosUrl = {
  apenasEmAtividade: boolean;
  partidos: readonly string[];
  ocultarAmostraPequena: boolean;
  sexo: DeputadoSexo | null;
};

export type ResultadoFiltros = ResultadoFiltrosUrl & {
  externalIdProposicoesFiltroConcordancia: readonly number[];
};

export type ResultadoFiltroId = keyof ResultadoFiltros;

export type ResultadoFiltroAtivo = FiltroAtivo<ResultadoFiltroId>;

export const RESULTADO_FILTROS_URL_PADRAO: ResultadoFiltrosUrl = {
  apenasEmAtividade: false,
  partidos: [],
  ocultarAmostraPequena: false,
  sexo: null,
};

export const RESULTADO_FILTROS_PADRAO: ResultadoFiltros = {
  ...RESULTADO_FILTROS_URL_PADRAO,
  externalIdProposicoesFiltroConcordancia: [],
};

export const RESULTADO_FILTRO_NOME: Record<ResultadoFiltroId, string> = {
  apenasEmAtividade: "Apenas em atividade",
  partidos: "Partido",
  ocultarAmostraPequena: "Ocultar amostra pequena",
  sexo: "Sexo",
  externalIdProposicoesFiltroConcordancia: "Concordância",
};

// Descarta campos extras de fontes estruturalmente compatíveis, como o estado
// do matcher, para que o recorte da URL não carregue nada além dela.
export function toResultadoFiltrosUrl(
  filtros: ResultadoFiltrosUrl,
): ResultadoFiltrosUrl {
  return {
    apenasEmAtividade: filtros.apenasEmAtividade,
    partidos: [...filtros.partidos],
    ocultarAmostraPequena: filtros.ocultarAmostraPequena,
    sexo: filtros.sexo,
  };
}

export function toResultadoFiltros(
  filtros: ResultadoFiltros,
): ResultadoFiltros {
  return {
    ...toResultadoFiltrosUrl(filtros),
    externalIdProposicoesFiltroConcordancia: [
      ...filtros.externalIdProposicoesFiltroConcordancia,
    ],
  };
}

// Chave e igualdade saem da mesma lista de campos: um filtro novo entra em um
// lugar só e todos os pontos de comparação acompanham.
export function toResultadoFiltrosUrlKey(filtros: ResultadoFiltrosUrl): string {
  return [
    `atividade=${filtros.apenasEmAtividade}`,
    `partidos=${toSelecaoKey(filtros.partidos)}`,
    `amostra=${filtros.ocultarAmostraPequena}`,
    `sexo=${filtros.sexo ?? ""}`,
  ].join("|");
}

export function toResultadoFiltrosKey(filtros: ResultadoFiltros): string {
  const marcadas = [...filtros.externalIdProposicoesFiltroConcordancia].sort(
    (a, b) => a - b,
  );
  return `${toResultadoFiltrosUrlKey(filtros)}|concordancia=${marcadas.join(",")}`;
}

export function saoResultadoFiltrosUrlIguais(
  a: ResultadoFiltrosUrl,
  b: ResultadoFiltrosUrl,
): boolean {
  return toResultadoFiltrosUrlKey(a) === toResultadoFiltrosUrlKey(b);
}

export function descreverResultadoFiltrosAtivos(
  filtros: ResultadoFiltros,
): readonly ResultadoFiltroAtivo[] {
  const ativos: ResultadoFiltroAtivo[] = [];
  const marcadas = filtros.externalIdProposicoesFiltroConcordancia.length;

  if (filtros.apenasEmAtividade) {
    ativos.push(
      toFiltroAtivo(
        "apenasEmAtividade",
        RESULTADO_FILTRO_NOME.apenasEmAtividade,
      ),
    );
  }
  if (filtros.partidos.length > 0) {
    ativos.push(
      toFiltroAtivo(
        "partidos",
        RESULTADO_FILTRO_NOME.partidos,
        descreverSelecao(filtros.partidos, (sigla) => sigla, "partidos"),
      ),
    );
  }
  if (filtros.ocultarAmostraPequena) {
    ativos.push(
      toFiltroAtivo(
        "ocultarAmostraPequena",
        RESULTADO_FILTRO_NOME.ocultarAmostraPequena,
      ),
    );
  }
  if (filtros.sexo !== null) {
    ativos.push(
      toFiltroAtivo(
        "sexo",
        RESULTADO_FILTRO_NOME.sexo,
        toSexoLabel(filtros.sexo),
      ),
    );
  }
  if (marcadas > 0) {
    ativos.push(
      toFiltroAtivo(
        "externalIdProposicoesFiltroConcordancia",
        RESULTADO_FILTRO_NOME.externalIdProposicoesFiltroConcordancia,
        marcadas === 1 ? "1 proposta" : `${marcadas} propostas`,
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
  return { ...filtros, [id]: RESULTADO_FILTROS_PADRAO[id] };
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
  return toResultadoFiltrosKey(a) === toResultadoFiltrosKey(b);
}
