import { MIN_POSICOES_COMPUTAVEIS } from "@vota-comigo/shared-types";
import type {
  EscopoMatcher,
  PosicaoUsuarioMatcher,
} from "@vota-comigo/shared-types";

import type { MatcherRascunho } from "./matcher-rascunho";
import { validateExecucao } from "./matcher-validation";

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
export type MatcherHref = MatcherRoute | PosicoesHref | ResultadoHref;
export type ResultadoSearchParams = {
  atividade?: string;
  escopo?: string;
};
export type ResultadoUrlState = {
  apenasEmAtividade: boolean;
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
    apenasEmAtividade: params.atividade === "1",
  };
}

export function buildResultadoHref(state: ResultadoUrlState): ResultadoHref {
  const params = new URLSearchParams();
  if (state.escopo === "nacional") params.set("escopo", state.escopo);
  if (state.apenasEmAtividade) params.set("atividade", "1");
  const search = params.toString();
  return search ? `/matcher/resultado?${search}` : "/matcher/resultado";
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
