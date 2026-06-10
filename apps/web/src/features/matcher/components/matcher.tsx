"use client";

import type { ProposicaoCard } from "@vota-comigo/shared-types";

import { useFeedState } from "@/shared/proposicao";

import { useMatcherState } from "../hooks/use-matcher-state";
import type { MatcherStep } from "../lib/matcher-state";
import { StepIndicator } from "./step-indicator";
import { StepLocal } from "./step-local";
import { StepPosicoes } from "./step-posicoes";
import { StepResultado } from "./step-resultado";
import { StepSelecao } from "./step-selecao";

type MatcherProps = {
  initialProposicoes: ProposicaoCard[];
  initialTotal: number;
};

const STEP_LABELS: Record<MatcherStep, string> = {
  local: "Onde você vota",
  selecao: "Escolha proposições",
  posicoes: "Sua posição",
  resultado: "Quem vota com você",
};

export function Matcher({ initialProposicoes, initialTotal }: MatcherProps) {
  const matcher = useMatcherState(initialProposicoes);
  const { state } = matcher;

  const feed = useFeedState(initialProposicoes, initialTotal);

  return (
    <section className="grid gap-8">
      <header className="grid gap-3">
        <p className="text-sm font-[650] text-primary">Quem vota comigo</p>
        <h1 className="text-2xl leading-tight font-[720] tracking-[-0.02em] text-ink">
          {STEP_LABELS[state.step]}
        </h1>
        <StepIndicator current={state.step} onNavigate={matcher.goToStep} />
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
          canLoadMore={feed.canLoadMore}
          display={feed.display}
          items={feed.items}
          onAdvance={() => matcher.goToStep("posicoes")}
          onBack={() => matcher.goToStep("local")}
          onClearSearch={feed.clearSearch}
          onLoadMore={feed.loadMore}
          onSubmitSearch={feed.submitSearch}
          onToggle={matcher.toggleProposicao}
          query={feed.query}
          selected={state.selected}
          status={feed.status}
          total={feed.total}
          totalComputaveis={matcher.validation.totalComputaveis}
          totalSelecionadas={matcher.validation.totalSelecionadas}
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
