import {
  deputadoSexoSchema,
  matcherSortSchema,
  MIN_POSICOES_COMPUTAVEIS,
} from "@vota-comigo/shared-types";
import type {
  DeputadoSexo,
  EscopoMatcher,
  PosicaoUsuarioMatcher,
} from "@vota-comigo/shared-types";

import {
  parseComparativoDeputadosIds,
  toComparativoDeputadosSegment,
} from "@/shared/deputado";

import type { MatcherRascunho } from "./matcher-rascunho";
import { validateExecucao } from "./matcher-validation";
import {
  toResultadoFiltrosUrlKey,
  type ResultadoFiltrosUrl,
} from "./resultado-filtros";

export type MatcherRoute =
  | "/matcher/local"
  | "/matcher/proposicoes"
  | "/matcher/posicoes"
  | "/matcher/resultado";
export type StepStatus = "done" | "current" | "upcoming";
export type PosicoesRouteView =
  | { view: "card"; index: number }
  | { view: "revisao" };
export type PosicoesHref =
  | `/matcher/posicoes/${number}`
  | "/matcher/posicoes/revisao";
export type ResultadoHref =
  | "/matcher/resultado"
  | `/matcher/resultado?${string}`;
export type ResultadoDetalheHref = `/matcher/resultado/${number}`;
export type ComparativoHref = `/matcher/comparativo/${string}`;
export type MatcherHref =
  | MatcherRoute
  | PosicoesHref
  | ResultadoHref
  | ResultadoDetalheHref
  | ComparativoHref;
export type ResultadoSearchParams = {
  atividade?: string;
  escopo?: string;
  partido?: string | readonly string[];
  amostra?: string;
  sexo?: string;
  sort?: string;
};
export type ResultadoUrlState = ResultadoFiltrosUrl & {
  escopo: EscopoMatcher;
};

export const MATCHER_ROUTE_ORDER: readonly MatcherRoute[] = [
  "/matcher/local",
  "/matcher/proposicoes",
  "/matcher/posicoes",
  "/matcher/resultado",
];

export function parseResultadoUrlState(
  params: ResultadoSearchParams,
): ResultadoUrlState {
  return {
    escopo: params.escopo === "nacional" ? "nacional" : "estadual",
    sort: matcherSortSchema.safeParse(params.sort).data ?? "compatibilidade",
    apenasEmAtividade: params.atividade === "1",
    partidos: parsePartidos(params.partido),
    ocultarAmostraPequena: params.amostra === "1",
    sexo: parseSexo(params.sexo),
  };
}

function parseSexo(raw: string | undefined): DeputadoSexo | null {
  const parsed = deputadoSexoSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// Uma sigla repetida na query string chega como array; uma só, como string.
function parsePartidos(raw: string | readonly string[] | undefined): string[] {
  if (raw === undefined) return [];
  const siglas = (Array.isArray(raw) ? raw : [raw as string])
    .flatMap((valor) => valor.split(","))
    .map((valor) => valor.trim().toUpperCase())
    .filter((valor) => valor.length > 0);
  return [...new Set(siglas)];
}

export function toResultadoUrlStateKey(state: ResultadoUrlState): string {
  return `${state.escopo}|${toResultadoFiltrosUrlKey(state)}`;
}

export function saoResultadoUrlStatesIguais(
  a: ResultadoUrlState,
  b: ResultadoUrlState,
): boolean {
  return toResultadoUrlStateKey(a) === toResultadoUrlStateKey(b);
}

export function buildResultadoHref(state: ResultadoUrlState): ResultadoHref {
  const params = new URLSearchParams();
  if (state.escopo === "nacional") params.set("escopo", state.escopo);
  if (state.sort !== undefined && state.sort !== "compatibilidade") {
    params.set("sort", state.sort);
  }
  if (state.apenasEmAtividade) params.set("atividade", "1");
  for (const sigla of [...state.partidos].sort())
    params.append("partido", sigla);
  if (state.ocultarAmostraPequena) params.set("amostra", "1");
  if (state.sexo !== null) params.set("sexo", state.sexo);
  const search = params.toString();
  return search ? `/matcher/resultado?${search}` : "/matcher/resultado";
}

export function buildResultadoDetalheHref(
  externalIdDeputado: number,
): ResultadoDetalheHref {
  return `/matcher/resultado/${externalIdDeputado}`;
}

export function parseComparativoIds(segment: string): number[] | null {
  return parseComparativoDeputadosIds(segment);
}

export function buildComparativoHref(
  externalIdsDeputado: readonly number[],
): ComparativoHref {
  return `/matcher/comparativo/${toComparativoDeputadosSegment(externalIdsDeputado)}`;
}

export function resolvePosicoesSegment(
  segment: string,
  totalSelecionadas: number,
): PosicoesRouteView | null {
  if (segment === "revisao") return { view: "revisao" };
  if (totalSelecionadas === 0) return null;
  const position = Number(segment);
  if (!Number.isInteger(position)) return null;
  return {
    view: "card",
    index: Math.min(Math.max(position - 1, 0), totalSelecionadas - 1),
  };
}

export function toPosicoesHref(destination: PosicoesRouteView): PosicoesHref {
  if (destination.view === "revisao") return "/matcher/posicoes/revisao";
  return `/matcher/posicoes/${destination.index + 1}`;
}

export function stepStatus(
  currentRoute: MatcherRoute,
  route: MatcherRoute,
): StepStatus {
  const currentIndex = MATCHER_ROUTE_ORDER.indexOf(currentRoute);
  const routeIndex = MATCHER_ROUTE_ORDER.indexOf(route);
  if (routeIndex < currentIndex) return "done";
  if (routeIndex === currentIndex) return "current";
  return "upcoming";
}

export function getFurthestMatcherRoute(
  rascunho: MatcherRascunho,
): MatcherRoute {
  if (rascunho.siglaUf === null) return "/matcher/local";
  const selectedPosicoes = rascunho.selected
    .map((card) => rascunho.posicoes.get(card.externalIdProposicao))
    .filter(
      (posicao): posicao is PosicaoUsuarioMatcher => posicao !== undefined,
    );
  if (
    validateExecucao({
      totalSelecionadas: rascunho.selected.length,
      posicoes: selectedPosicoes,
    }).valid
  ) {
    return "/matcher/resultado";
  }
  if (rascunho.selected.length >= MIN_POSICOES_COMPUTAVEIS) {
    return "/matcher/posicoes";
  }
  return "/matcher/proposicoes";
}

export function resolveMatcherRoute(
  requestedRoute: MatcherRoute,
  rascunho: MatcherRascunho,
): MatcherRoute {
  const furthestRoute = getFurthestMatcherRoute(rascunho);
  if (
    MATCHER_ROUTE_ORDER.indexOf(requestedRoute) >
    MATCHER_ROUTE_ORDER.indexOf(furthestRoute)
  ) {
    return furthestRoute;
  }
  return requestedRoute;
}
