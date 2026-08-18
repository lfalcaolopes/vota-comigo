import type {
  DeputadoFaixaEtaria,
  DeputadoSexo,
} from "@vota-comigo/shared-types";

import {
  descreverSelecao,
  saoSelecoesIguais,
  toFiltroAtivo,
  type FiltroAtivo,
} from "@/shared/ui";

import { toEstadoLabel, toFaixaEtariaLabel, toSexoLabel } from "./presentation";

export type DeputadoFeedFiltros = {
  incluirForaDeExercicio: boolean;
  ufs: readonly string[];
  partidos: readonly string[];
  sexo: DeputadoSexo | null;
  faixasEtarias: readonly DeputadoFaixaEtaria[];
};

export type DeputadoFiltroId = keyof DeputadoFeedFiltros;

export type DeputadoFiltroAtivo = FiltroAtivo<DeputadoFiltroId>;

export const FILTROS_PADRAO: DeputadoFeedFiltros = {
  incluirForaDeExercicio: false,
  ufs: [],
  partidos: [],
  sexo: null,
  faixasEtarias: [],
};

export function descreverFiltrosAtivos(
  filtros: DeputadoFeedFiltros,
): readonly DeputadoFiltroAtivo[] {
  const ativos: DeputadoFiltroAtivo[] = [];

  if (filtros.incluirForaDeExercicio) {
    ativos.push(
      toFiltroAtivo(
        "incluirForaDeExercicio",
        FILTRO_NOME.incluirForaDeExercicio,
      ),
    );
  }
  if (filtros.ufs.length > 0) {
    ativos.push(
      toFiltroAtivo(
        "ufs",
        FILTRO_NOME.ufs,
        descreverSelecao(filtros.ufs, toEstadoLabel, PLURAL.ufs),
      ),
    );
  }
  if (filtros.partidos.length > 0) {
    ativos.push(
      toFiltroAtivo(
        "partidos",
        FILTRO_NOME.partidos,
        descreverSelecao(filtros.partidos, (sigla) => sigla, PLURAL.partidos),
      ),
    );
  }
  if (filtros.sexo !== null) {
    ativos.push(
      toFiltroAtivo("sexo", FILTRO_NOME.sexo, toSexoLabel(filtros.sexo)),
    );
  }
  if (filtros.faixasEtarias.length > 0) {
    ativos.push(
      toFiltroAtivo(
        "faixasEtarias",
        FILTRO_NOME.faixasEtarias,
        descreverSelecao(
          filtros.faixasEtarias,
          toFaixaEtariaLabel,
          PLURAL.faixasEtarias,
        ),
      ),
    );
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
    a.incluirForaDeExercicio === b.incluirForaDeExercicio &&
    a.sexo === b.sexo &&
    saoSelecoesIguais(a.ufs, b.ufs) &&
    saoSelecoesIguais(a.partidos, b.partidos) &&
    saoSelecoesIguais(a.faixasEtarias, b.faixasEtarias)
  );
}

const FILTRO_NOME: Record<DeputadoFiltroId, string> = {
  incluirForaDeExercicio: "Incluindo quem não está em exercício",
  ufs: "Estado",
  partidos: "Partido",
  sexo: "Sexo",
  faixasEtarias: "Idade",
};

const PLURAL = {
  ufs: "estados",
  partidos: "partidos",
  faixasEtarias: "faixas",
} as const;
