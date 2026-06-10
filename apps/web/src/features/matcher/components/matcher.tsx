"use client";

import type { ProposicaoCard } from "@vota-comigo/shared-types";

import { useMatcherState } from "../hooks/use-matcher-state";
import type { MatcherStep } from "../lib/matcher-state";
import { StepLocal } from "./step-local";
import { StepPosicoes } from "./step-posicoes";
import { StepResultado } from "./step-resultado";
import { StepSelecao } from "./step-selecao";

type MatcherProps = {
  initialProposicoes: ProposicaoCard[];
};

const STEP_LABELS: Record<MatcherStep, string> = {
  local: "Onde você vota",
  selecao: "Escolha proposições",
  posicoes: "Sua posição",
  resultado: "Quem vota com você",
};

const STEP_ORDER: MatcherStep[] = ["local", "selecao", "posicoes", "resultado"];

export function Matcher({ initialProposicoes }: MatcherProps) {
  const matcher = useMatcherState(initialProposicoes);
  const { state } = matcher;

  return (
    <section className="grid gap-8">
      <header className="grid gap-3">
        <p className="text-sm font-[650] text-primary">Quem vota comigo</p>
        <h1 className="text-2xl leading-tight font-[720] tracking-[-0.02em] text-ink">
          {STEP_LABELS[state.step]}
        </h1>
        <ol className="flex flex-wrap gap-2 text-xs font-[650] text-muted">
          {STEP_ORDER.map((step, position) => (
            <li
              aria-current={step === state.step ? "step" : undefined}
              className="rounded-full border border-border px-2.5 py-1 aria-[current=step]:border-primary aria-[current=step]:bg-primary-soft aria-[current=step]:text-ink"
              key={step}
            >
              {position + 1}. {STEP_LABELS[step]}
            </li>
          ))}
        </ol>
      </header>

      {state.step === "local" ? (
        <StepLocal
          cidade={state.cidade}
          onConfirm={(siglaUf, cidade) => {
            matcher.setLocal(siglaUf, cidade);
            matcher.goToStep("selecao");
          }}
          siglaUf={state.siglaUf}
        />
      ) : null}

      {state.step === "selecao" ? (
        <StepSelecao
          candidates={initialProposicoes}
          onAdvance={() => matcher.goToStep("posicoes")}
          onBack={() => matcher.goToStep("local")}
          onToggle={matcher.toggleProposicao}
          selected={state.selected}
        />
      ) : null}

      {state.step === "posicoes" ? (
        <StepPosicoes
          canRun={matcher.canRun}
          faltamComputaveis={matcher.validation.faltamComputaveis}
          onBack={() => matcher.goToStep("selecao")}
          onRun={matcher.execute}
          onSetPosicao={matcher.setPosicao}
          posicoes={state.posicoes}
          selected={state.selected}
        />
      ) : null}

      {state.step === "resultado" ? (
        <StepResultado
          onBack={() => matcher.goToStep("posicoes")}
          onRetry={matcher.execute}
          resultado={matcher.resultado}
          status={state.status}
        />
      ) : null}
    </section>
  );
}
