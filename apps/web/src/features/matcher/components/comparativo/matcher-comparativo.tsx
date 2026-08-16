"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMatcherComparativo } from "../../hooks/use-matcher-comparativo";
import { buildExecucaoRequest } from "../../lib/matcher-payload";
import { parseComparativoIds } from "../../lib/matcher-route";
import { MatcherRouteGate } from "../flow/matcher-route-gate";
import { MatcherStepFrame } from "../flow/matcher-step-frame";
import { useMatcher } from "../matcher-provider";
import { StepComparativo } from "./step-comparativo";

const ROUTE = "/matcher/resultado" as const;

export function MatcherComparativo({ ids }: { ids: string }) {
  const router = useRouter();
  const { state } = useMatcher();
  const externalIdsDeputado = parseComparativoIds(ids);
  const { detalhes, perfis, retry, status } =
    useMatcherComparativo(externalIdsDeputado);
  const posicoes =
    state.siglaUf === null
      ? []
      : buildExecucaoRequest({
          siglaUf: state.siglaUf,
          escopo: state.escopo,
          cidade: state.cidade,
          posicoes: state.posicoes,
          apenasEmAtividade: state.apenasEmAtividade,
          externalIdProposicoesFiltroConcordancia:
            state.externalIdProposicoesFiltroConcordancia,
        }).posicoes;
  const deputados = detalhes.map(({ deputado, metrics }) => ({
    ...deputado,
    compatibilidadeBruta: metrics.compatibilidadeBruta,
    amostraComparavel: metrics.amostraComparavel,
    scoreOrdenacaoPercentual: metrics.scoreOrdenacaoPercentual,
    alertas: metrics.alertas,
  }));

  useEffect(() => {
    if (externalIdsDeputado !== null) return;
    router.replace("/matcher/resultado");
  }, [externalIdsDeputado, router]);

  if (externalIdsDeputado === null) {
    return (
      <p aria-live="polite" className="text-sm text-muted" role="status">
        Retomando o passo possível…
      </p>
    );
  }

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
              deputados={deputados}
              detalhes={detalhes}
              escopo={state.escopo}
              onBack={() => router.push("/matcher/resultado")}
              onRetry={retry}
              perfis={perfis}
              posicoes={posicoes}
              siglaUf={state.siglaUf}
              status={status}
            />
          </div>
        </div>
      </MatcherStepFrame>
    </MatcherRouteGate>
  );
}
