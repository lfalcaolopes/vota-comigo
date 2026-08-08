"use client";

import { useEffect, useRef } from "react";

import { useMatcherNavigation } from "../../hooks/use-matcher-navigation";
import { buildExecucaoRequest } from "../../lib/matcher-payload";
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
  const hasRequestedResultadoRef = useRef(false);
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
    if (matcher.resultado !== null || hasRequestedResultadoRef.current) return;
    hasRequestedResultadoRef.current = true;
    void matcher.execute();
  }, [matcher]);

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
                apenasEmAtividade={matcher.apenasEmAtividade}
                escopo={matcher.escopo}
                hasMore={matcher.hasMore}
                onApenasEmAtividadeChange={matcher.setApenasEmAtividade}
                onBack={() => navigate("/matcher/posicoes")}
                onCancelComparativoSelection={
                  matcher.cancelComparativoSelection
                }
                onEscopoChange={matcher.setEscopo}
                onLoadMore={matcher.loadMore}
                onOpenComparativo={matcher.openComparativo}
                onOpenDetalhe={matcher.openDetalhe}
                onRetry={matcher.execute}
                onStartComparativoSelection={matcher.startComparativoSelection}
                onToggleComparativoDeputado={matcher.toggleComparativoDeputado}
                resultado={matcher.resultado}
                state={state}
                status={state.status}
              />
            )}
          </div>
        </div>
      </MatcherStepFrame>
    </MatcherRouteGate>
  );
}
