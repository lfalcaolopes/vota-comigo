"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useMatcherNavigation } from "../../hooks/use-matcher-navigation";
import {
  resolvePosicoesSegment,
  toPosicoesHref,
} from "../../lib/matcher-route";
import { MatcherRouteGate } from "../flow/matcher-route-gate";
import { MatcherStepFrame } from "../flow/matcher-step-frame";
import { useMatcher } from "../matcher-provider";
import { StepPosicoes } from "./step-posicoes";

const ROUTE = "/matcher/posicoes" as const;

export function MatcherPosicoes({ segment }: { segment: string }) {
  const matcher = useMatcher();
  const navigate = useMatcherNavigation();
  const router = useRouter();
  const position = resolvePosicoesSegment(
    segment,
    matcher.state.selected.length,
  );
  const canonicalHref = position ? toPosicoesHref(position) : null;

  useEffect(() => {
    if (matcher.state.selected.length === 0) return;
    if (canonicalHref === null) {
      router.replace("/matcher/posicoes/1");
      return;
    }
    if (canonicalHref !== `/matcher/posicoes/${segment}`) {
      router.replace(canonicalHref);
    }
  }, [canonicalHref, matcher.state.selected.length, router, segment]);

  return (
    <MatcherRouteGate route={ROUTE}>
      <MatcherStepFrame route={ROUTE}>
        {position === null ? (
          <p aria-live="polite" className="text-sm text-muted" role="status">
            Retomando o passo possível…
          </p>
        ) : (
          <StepPosicoes
            canRun={matcher.canRun}
            faltamComputaveis={matcher.validation.faltamComputaveis}
            faltamRespostas={matcher.validation.faltamRespostas}
            index={
              position.view === "card"
                ? position.index
                : matcher.state.selected.length - 1
            }
            onBack={() => navigate("/matcher/proposicoes")}
            onNavigate={(destination) =>
              navigate(
                toPosicoesHref(destination),
                destination.view === "card" ? "position" : "step",
              )
            }
            onReviewBack={() => router.back()}
            onRun={async () => {
              if (await matcher.execute()) navigate("/matcher/resultado");
            }}
            onSetPosicao={matcher.setPosicao}
            posicoes={matcher.state.posicoes}
            selected={matcher.state.selected}
            view={position.view}
          />
        )}
      </MatcherStepFrame>
    </MatcherRouteGate>
  );
}
