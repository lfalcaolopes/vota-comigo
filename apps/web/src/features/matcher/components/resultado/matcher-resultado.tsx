"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { useMatcherNavigation } from "../../hooks/use-matcher-navigation";
import {
  buildComparativoHref,
  buildResultadoHref,
  parseResultadoUrlState,
} from "../../lib/matcher-route";
import { MatcherRouteGate } from "../flow/matcher-route-gate";
import { MatcherStepFrame } from "../flow/matcher-step-frame";
import { useMatcher } from "../matcher-provider";
import { StepResultado } from "./step-resultado";

const ROUTE = "/matcher/resultado" as const;

export function MatcherResultado() {
  const matcher = useMatcher();
  const navigate = useMatcherNavigation();
  const searchParams = useSearchParams();
  const requestedFilters = parseResultadoUrlState({
    escopo: searchParams.get("escopo") ?? undefined,
    atividade: searchParams.get("atividade") ?? undefined,
  });
  const requestedFiltersKey = `${requestedFilters.escopo}:${requestedFilters.apenasEmAtividade}`;
  const requestedFiltersRef = useRef<string | null>(null);
  const { state } = matcher;

  useEffect(() => {
    if (
      !matcher.isHydrated ||
      requestedFiltersRef.current === requestedFiltersKey
    ) {
      return;
    }
    requestedFiltersRef.current = requestedFiltersKey;
    if (
      matcher.resultado !== null &&
      matcher.escopo === requestedFilters.escopo &&
      matcher.apenasEmAtividade === requestedFilters.apenasEmAtividade
    ) {
      return;
    }
    void matcher.executeResultado(requestedFilters);
  }, [matcher, requestedFilters, requestedFiltersKey]);

  const areRequestedFiltersActive =
    matcher.escopo === requestedFilters.escopo &&
    matcher.apenasEmAtividade === requestedFilters.apenasEmAtividade;
  const hasRequestedResult =
    matcher.resultado !== null && areRequestedFiltersActive;
  const isWaitingForResultado =
    !hasRequestedResult &&
    (!areRequestedFiltersActive || state.status !== "error");
  const visibleState = isWaitingForResultado
    ? {
        ...state,
        escopo: requestedFilters.escopo,
        apenasEmAtividade: requestedFilters.apenasEmAtividade,
        resultados: {
          ...state.resultados,
          [requestedFilters.escopo]: null,
        },
        status: "loading" as const,
      }
    : state;

  return (
    <MatcherRouteGate route={ROUTE}>
      <MatcherStepFrame route={ROUTE}>
        <div className="mx-auto w-full max-w-6xl">
          <div className="w-full max-w-4xl">
            <StepResultado
              apenasEmAtividade={requestedFilters.apenasEmAtividade}
              externalIdProposicoesFiltroConcordancia={
                matcher.externalIdProposicoesFiltroConcordancia
              }
              escopo={requestedFilters.escopo}
              hasMore={matcher.hasMore}
              onApenasEmAtividadeChange={(apenasEmAtividade) =>
                navigate(
                  buildResultadoHref({
                    ...requestedFilters,
                    apenasEmAtividade,
                  }),
                  "filter",
                )
              }
              onCancelComparativoSelection={matcher.cancelComparativoSelection}
              onClearFiltroConcordancia={matcher.clearFiltroConcordancia}
              onEscopoChange={(escopo) =>
                navigate(
                  buildResultadoHref({ ...requestedFilters, escopo }),
                  "filter",
                )
              }
              onLoadMore={matcher.loadMore}
              onToggleFiltroConcordancia={matcher.toggleFiltroConcordancia}
              onOpenComparativo={() => {
                const href = buildComparativoHref(
                  state.selectedComparativoDeputados.map(
                    (deputado) => deputado.externalIdDeputado,
                  ),
                );
                matcher.cancelComparativoSelection();
                navigate(href);
              }}
              onRetry={() => matcher.executeResultado(requestedFilters)}
              onStartComparativoSelection={matcher.startComparativoSelection}
              onToggleComparativoDeputado={matcher.toggleComparativoDeputado}
              resultado={isWaitingForResultado ? null : matcher.resultado}
              state={visibleState}
              status={visibleState.status}
            />
          </div>
        </div>
      </MatcherStepFrame>
    </MatcherRouteGate>
  );
}
