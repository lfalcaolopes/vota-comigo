"use client";

import type { ProposicaoCard, TemaDisponivel } from "@vota-comigo/shared-types";

import { useFeedState } from "@/shared/proposicao";

import { useMatcherState } from "../hooks/use-matcher-state";
import type { MatcherStep } from "../lib/matcher-state";
import { DeputadoDetalhe } from "./deputado-detalhe";
import { StepIndicator } from "./step-indicator";
import { StepLocal } from "./step-local";
import { StepPosicoes } from "./step-posicoes";
import { StepResultado } from "./step-resultado";
import { StepSelecao } from "./step-selecao";

type MatcherProps = {
  initialProposicoes: ProposicaoCard[];
  initialTotal: number;
  temas: readonly TemaDisponivel[];
};

const STEP_LABELS: Record<MatcherStep, string> = {
  local: "Onde você vota",
  selecao: "Escolha proposições",
  posicoes: "Sua posição",
  resultado: "Quem vota com você",
};

export function Matcher({ initialProposicoes, initialTotal, temas }: MatcherProps) {
  const matcher = useMatcherState(initialProposicoes);
  const { state } = matcher;

  const feed = useFeedState(initialProposicoes, initialTotal);

  return (
    <section className="grid gap-8">
      <header className="mx-auto grid w-full max-w-2xl gap-3">
        <p className="text-sm font-[650] text-primary">Quem vota comigo</p>
        <h1 className="text-2xl leading-tight font-[720] tracking-[-0.02em] text-ink">
          {STEP_LABELS[state.step]}
        </h1>
        <StepIndicator current={state.step} onNavigate={matcher.goToStep} />
      </header>

      {state.step === "local" ? (
        <div className="mx-auto w-full max-w-2xl">
          <StepLocal
            cidade={state.cidade}
            onConfirm={(siglaUf, cidade) => {
              matcher.setLocal(siglaUf, cidade);
              matcher.goToStep("selecao");
            }}
            siglaUf={state.siglaUf}
          />
        </div>
      ) : null}

      {state.step === "selecao" ? (
        <div className="mx-auto w-full max-w-2xl">
          <StepSelecao
          canLoadMore={feed.canLoadMore}
          display={feed.display}
          items={feed.items}
          onAdvance={() => matcher.goToStep("posicoes")}
          onBack={() => matcher.goToStep("local")}
          onChangeOrdenacao={feed.changeOrdenacao}
          onChangeTema={(cod) => {
            if (feed.tema === cod) {
              void feed.clearTema();
            } else {
              void feed.changeTema(cod);
            }
          }}
          onClearFilters={feed.clearFilters}
          onClearSearch={feed.clearSearch}
          onLoadMore={feed.loadMore}
          onSubmitSearch={feed.submitSearch}
          onToggle={matcher.toggleProposicao}
          ordenacao={feed.ordenacao}
          query={feed.query}
          selected={state.selected}
          status={feed.status}
          tema={feed.tema}
          temas={temas}
          total={feed.total}
          totalSelecionadas={matcher.validation.totalSelecionadas}
          />
        </div>
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
        <div className="mx-auto w-full max-w-2xl">
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
              onBack={() => matcher.goToStep("posicoes")}
              onEscopoChange={matcher.setEscopo}
              onLoadMore={matcher.loadMore}
              onOpenDetalhe={matcher.openDetalhe}
              onRetry={matcher.execute}
              resultado={matcher.resultado}
              state={state}
              status={state.status}
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
