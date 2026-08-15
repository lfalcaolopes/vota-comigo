"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { useMatcherNavigation } from "../../hooks/use-matcher-navigation";
import {
  buildComparativoHref,
  buildResultadoHref,
  parseResultadoUrlState,
  type ResultadoUrlState,
} from "../../lib/matcher-route";
import type { ResultadoFiltros } from "../../lib/resultado-filtros";
import { MatcherRouteGate } from "../flow/matcher-route-gate";
import { MatcherStepFrame } from "../flow/matcher-step-frame";
import { useMatcher } from "../matcher-provider";
import { StepResultado } from "./step-resultado";

const ROUTE = "/matcher/resultado" as const;

function toRequestedFiltersKey(state: ResultadoUrlState): string {
  return `${state.escopo}:${state.apenasEmAtividade}`;
}

export function MatcherResultado() {
  const matcher = useMatcher();
  const navigate = useMatcherNavigation();
  const searchParams = useSearchParams();
  const requestedFilters = parseResultadoUrlState({
    escopo: searchParams.get("escopo") ?? undefined,
    atividade: searchParams.get("atividade") ?? undefined,
  });
  const requestedFiltersKey = toRequestedFiltersKey(requestedFilters);
  const requestedFiltersRef = useRef<string | null>(null);
  // A aplicação em bloco executa o recorte e só então navega, então o efeito da
  // URL fica suspenso até o endereço alcançar a chave que ela já executou.
  const pendingFiltersRef = useRef<string | null>(null);
  const { state } = matcher;
  // O recorte aplicado é sempre a combinação das duas fontes: a URL carrega
  // atividade, o rascunho carrega a concordância (ADR 021).
  const filtros: ResultadoFiltros = {
    apenasEmAtividade: requestedFilters.apenasEmAtividade,
    externalIdProposicoesFiltroConcordancia:
      matcher.externalIdProposicoesFiltroConcordancia,
  };

  useEffect(() => {
    if (!matcher.isHydrated) return;
    if (pendingFiltersRef.current !== null) {
      if (pendingFiltersRef.current !== requestedFiltersKey) return;
      pendingFiltersRef.current = null;
      requestedFiltersRef.current = requestedFiltersKey;
      return;
    }
    if (requestedFiltersRef.current === requestedFiltersKey) return;
    requestedFiltersRef.current = requestedFiltersKey;
    if (
      matcher.resultado !== null &&
      matcher.escopo === requestedFilters.escopo &&
      matcher.apenasEmAtividade === requestedFilters.apenasEmAtividade
    ) {
      return;
    }
    void matcher.executeResultado({
      ...requestedFilters,
      externalIdProposicoesFiltroConcordancia:
        matcher.externalIdProposicoesFiltroConcordancia,
    });
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

  function applyFiltros(next: ResultadoFiltros) {
    const url = {
      escopo: requestedFilters.escopo,
      apenasEmAtividade: next.apenasEmAtividade,
    };
    if (next.apenasEmAtividade !== requestedFilters.apenasEmAtividade) {
      pendingFiltersRef.current = toRequestedFiltersKey(url);
      navigate(buildResultadoHref(url), "filter");
    }
    void matcher.executeResultado({ ...url, ...next });
  }

  return (
    <MatcherRouteGate route={ROUTE}>
      <MatcherStepFrame route={ROUTE}>
        <div className="mx-auto w-full max-w-6xl">
          <div className="w-full max-w-4xl">
            <StepResultado
              escopo={requestedFilters.escopo}
              filtros={filtros}
              hasMore={matcher.hasMore}
              onApplyFiltros={applyFiltros}
              onCancelComparativoSelection={matcher.cancelComparativoSelection}
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
              onRetry={() =>
                matcher.executeResultado({ ...requestedFilters, ...filtros })
              }
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
