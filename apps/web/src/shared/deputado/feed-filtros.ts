import type {
  DeputadoFaixaEtaria,
  DeputadoSexo,
} from "@vota-comigo/shared-types";

import { toFiltroAtivo, type FiltroAtivo } from "@/shared/ui";

import { toEstadoLabel, toFaixaEtariaLabel, toSexoLabel } from "./presentation";

export type DeputadoFeedFiltros = {
  emAtividade: boolean;
  ufs: readonly string[];
  partidos: readonly string[];
  sexo: DeputadoSexo | null;
  faixasEtarias: readonly DeputadoFaixaEtaria[];
};

export type DeputadoFiltroId = keyof DeputadoFeedFiltros;

export type DeputadoFiltroAtivo = FiltroAtivo<DeputadoFiltroId>;

export const FILTROS_PADRAO: DeputadoFeedFiltros = {
  emAtividade: false,
  ufs: [],
  partidos: [],
  sexo: null,
  faixasEtarias: [],
};

export function descreverFiltrosAtivos(
  filtros: DeputadoFeedFiltros,
): readonly DeputadoFiltroAtivo[] {
  const ativos: DeputadoFiltroAtivo[] = [];

  if (filtros.emAtividade) {
    ativos.push(toFiltroAtivo("emAtividade", FILTRO_NOME.emAtividade));
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

export function toggleValor<Valor extends string>(
  selecionados: readonly Valor[],
  valor: Valor,
): readonly Valor[] {
  return selecionados.includes(valor)
    ? selecionados.filter((atual) => atual !== valor)
    : [...selecionados, valor];
}

export function saoFiltrosIguais(
  a: DeputadoFeedFiltros,
  b: DeputadoFeedFiltros,
): boolean {
  return (
    a.emAtividade === b.emAtividade &&
    a.sexo === b.sexo &&
    saoSelecoesIguais(a.ufs, b.ufs) &&
    saoSelecoesIguais(a.partidos, b.partidos) &&
    saoSelecoesIguais(a.faixasEtarias, b.faixasEtarias)
  );
}

// Selecionar SP e depois RJ é o mesmo filtro que o inverso, então a ordem dos
// cliques não pode habilitar o "Aplicar" nem contar como recorte novo.
function saoSelecoesIguais(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

function descreverSelecao<Valor extends string>(
  selecionados: readonly Valor[],
  toLabel: (valor: Valor) => string,
  plural: string,
): string {
  return selecionados.length === 1
    ? toLabel(selecionados[0])
    : `${selecionados.length} ${plural}`;
}

const FILTRO_NOME: Record<DeputadoFiltroId, string> = {
  emAtividade: "Em atividade",
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
