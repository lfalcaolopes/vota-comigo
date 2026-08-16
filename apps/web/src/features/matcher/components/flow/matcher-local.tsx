"use client";

import { useMatcherNavigation } from "../../hooks/use-matcher-navigation";
import { useMatcher } from "../matcher-provider";
import { MatcherRouteGate } from "./matcher-route-gate";
import { MatcherStepFrame } from "./matcher-step-frame";
import { StepLocal } from "./step-local";

const ROUTE = "/matcher/local" as const;

export function MatcherLocal() {
  const matcher = useMatcher();
  const navigate = useMatcherNavigation();

  return (
    <MatcherRouteGate route={ROUTE}>
      <MatcherStepFrame route={ROUTE}>
        <div className="mx-auto w-full max-w-6xl">
          <div className="w-full max-w-2xl">
            <StepLocal
              onConfirm={(siglaUf) => {
                matcher.setLocal(siglaUf);
                navigate("/matcher/proposicoes");
              }}
              siglaUf={matcher.state.siglaUf}
            />
          </div>
        </div>
      </MatcherStepFrame>
    </MatcherRouteGate>
  );
}
