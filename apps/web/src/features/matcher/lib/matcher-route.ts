import { MIN_POSICOES_COMPUTAVEIS } from "@vota-comigo/shared-types";
import type { PosicaoUsuarioMatcher } from "@vota-comigo/shared-types";

import type { MatcherRascunho } from "./matcher-rascunho";
import { validateExecucao } from "./matcher-validation";

export type MatcherRoute =
  | "/matcher/local"
  | "/matcher/proposicoes"
  | "/matcher/posicoes"
  | "/matcher/resultado";
export type StepStatus = "done" | "current" | "upcoming";

export const MATCHER_ROUTE_ORDER: readonly MatcherRoute[] = [
  "/matcher/local",
  "/matcher/proposicoes",
  "/matcher/posicoes",
  "/matcher/resultado",
];

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
