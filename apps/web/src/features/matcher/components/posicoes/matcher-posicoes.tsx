"use client";

import { useMatcherNavigation } from "../../hooks/use-matcher-navigation";
import { MatcherRouteGate } from "../flow/matcher-route-gate";
import { MatcherStepFrame } from "../flow/matcher-step-frame";
import { useMatcher } from "../matcher-provider";
import { StepPosicoes } from "./step-posicoes";

const ROUTE = "/matcher/posicoes" as const;

export function MatcherPosicoes() {
  const matcher = useMatcher();
  const navigate = useMatcherNavigation();

  return (
    <MatcherRouteGate route={ROUTE}>
      <MatcherStepFrame route={ROUTE}>
        <StepPosicoes
          canRun={matcher.canRun}
          faltamComputaveis={matcher.validation.faltamComputaveis}
          faltamRespostas={matcher.validation.faltamRespostas}
          onBack={() => navigate("/matcher/proposicoes")}
          onRun={async () => {
            if (await matcher.execute()) navigate("/matcher/resultado");
          }}
          onSetPosicao={matcher.setPosicao}
          posicoes={matcher.state.posicoes}
          selected={matcher.state.selected}
        />
      </MatcherStepFrame>
    </MatcherRouteGate>
  );
}
