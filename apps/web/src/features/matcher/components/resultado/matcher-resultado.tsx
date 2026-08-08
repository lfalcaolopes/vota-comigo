"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { useMatcherNavigation } from "../../hooks/use-matcher-navigation";
import { buildExecucaoRequest } from "../../lib/matcher-payload";
import {
  buildResultadoHref,
  parseResultadoUrlState,
} from "../../lib/matcher-route";
import { StepComparativo } from "../comparativo/step-comparativo";
import { DeputadoDetalhe } from "../detalhe/deputado-detalhe";
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
  const comparativoPosicoes =
    state.siglaUf === null
      ? []
      : buildExecucaoRequest({
          siglaUf: state.siglaUf,
          escopo: state.escopo,
          cidade: state.cidade,
          posicoes: state.posicoes,
          apenasEmAtividade: state.apenasEmAtividade,
        }).posicoes;

  useEffect(() => {
    if (!matcher.isHydrated || requestedFiltersRef.current === requestedFiltersKey) {
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

  if (state.isComparativoOpen) {
    return (
      <MatcherRouteGate route={ROUTE}>
        <MatcherStepFrame
          description="Compare os deputados selecionados usando as mesmas proposições e posições que geraram o resultado."
          route={ROUTE}
          title="Comparativo de deputados"
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="w-full max-w-4xl">
              <StepComparativo
                deputados={state.selectedComparativoDeputados}
                detalhes={state.comparativoDetalhes}
                onBack={matcher.backFromComparativo}
                onRetry={matcher.openComparativo}
                perfis={state.comparativoPerfis}
                posicoes={comparativoPosicoes}
                status={state.comparativoStatus}
              />
            </div>
          </div>
        </MatcherStepFrame>
      </MatcherRouteGate>
    );
  }

  return (
    <MatcherRouteGate route={ROUTE}>
      <MatcherStepFrame route={ROUTE}>
        <div className="mx-auto w-full max-w-6xl">
          <div className="w-full max-w-4xl">
            {matcher.isDetalheOpen ? (
              <DeputadoDetalhe
                detalhe={matcher.detalhe}
                detalheDeputadoId={state.detalheDeputadoId}
                onBack={matcher.closeDetalhe}
                onRetry={matcher.openDetalhe}
                status={matcher.detalheStatus}
              />
            ) : (
              <StepResultado
                apenasEmAtividade={requestedFilters.apenasEmAtividade}
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
                onBack={() => navigate("/matcher/posicoes")}
                onCancelComparativoSelection={
                  matcher.cancelComparativoSelection
                }
                onEscopoChange={(escopo) =>
                  navigate(
                    buildResultadoHref({ ...requestedFilters, escopo }),
                    "filter",
                  )
                }
                onLoadMore={matcher.loadMore}
                onOpenComparativo={matcher.openComparativo}
                onOpenDetalhe={matcher.openDetalhe}
                onRetry={() => matcher.executeResultado(requestedFilters)}
                onStartComparativoSelection={matcher.startComparativoSelection}
                onToggleComparativoDeputado={matcher.toggleComparativoDeputado}
                resultado={isWaitingForResultado ? null : matcher.resultado}
                state={visibleState}
                status={visibleState.status}
              />
            )}
          </div>
        </div>
      </MatcherStepFrame>
    </MatcherRouteGate>
  );
}
