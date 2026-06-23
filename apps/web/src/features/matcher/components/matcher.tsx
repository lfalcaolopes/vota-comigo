"use client";

import type { ProposicaoCard, TemaDisponivel } from "@vota-comigo/shared-types";

import { useFeedState } from "@/shared/proposicao";

import { useMatcherState } from "../hooks/use-matcher-state";
import { buildExecucaoRequest } from "../lib/matcher-payload";
import type { MatcherStep } from "../lib/matcher-state";
import { StepComparativo } from "./comparativo/step-comparativo";
import { DeputadoDetalhe } from "./detalhe/deputado-detalhe";
import { StepIndicator } from "./flow/step-indicator";
import { StepLocal } from "./flow/step-local";
import { StepPosicoes } from "./posicoes/step-posicoes";
import { StepResultado } from "./resultado/step-resultado";
import { StepSelecao } from "./selecao/step-selecao";

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
  comparativo: "Comparativo de deputados",
};

const STEP_DESCRIPTIONS: Record<MatcherStep, string> = {
  local:
    "Informe seu estado para priorizar deputados da sua UF nos resultados. A cidade é opcional e não entra no cálculo.",
  selecao:
    "Escolha de 3 a 30 proposições. Quanto mais temas você incluir, mais o resultado consegue diferenciar deputados com históricos de votação parecidos.",
  posicoes:
    'Diga se cada proposição deveria ou não ser aprovada. Respostas "Não sei" ficam fora do cálculo.',
  resultado:
    "A compatibilidade mostra em quantas votações comparáveis o deputado votou de acordo com suas posições.",
  comparativo:
    "Compare os deputados selecionados usando as mesmas proposições e posições que geraram o resultado.",
};

export function Matcher({
  initialProposicoes,
  initialTotal,
  temas,
}: MatcherProps) {
  const matcher = useMatcherState(initialProposicoes);
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

  const feed = useFeedState(initialProposicoes, initialTotal);

  return (
    <section className="grid gap-8">
      <header className="mx-auto grid w-full max-w-6xl gap-3">
        <p className="text-sm font-[650] text-primary">Quem vota comigo</p>
        <h1 className="text-2xl leading-tight font-[720] tracking-[-0.02em] text-ink">
          {STEP_LABELS[state.step]}
        </h1>
        <p className="max-w-[68ch] text-sm leading-normal text-muted">
          {STEP_DESCRIPTIONS[state.step]}
        </p>
        <StepIndicator current={state.step} onNavigate={matcher.goToStep} />
      </header>

      {state.step === "local" ? (
        <div className="mx-auto w-full max-w-6xl">
          <div className="w-full max-w-2xl">
            <StepLocal
              cidade={state.cidade}
              onConfirm={(siglaUf, cidade) => {
                matcher.setLocal(siglaUf, cidade);
                matcher.goToStep("selecao");
              }}
              siglaUf={state.siglaUf}
            />
          </div>
        </div>
      ) : null}

      {state.step === "selecao" ? (
        <div className="mx-auto w-full max-w-6xl">
          <StepSelecao
            canAdvance={matcher.canAdvanceSelecao}
            canLoadMore={feed.canLoadMore}
            display={feed.display}
            items={feed.items}
            onAdvance={() => {
              if (matcher.canAdvanceSelecao) {
                matcher.goToStep("posicoes");
              }
            }}
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
          faltamRespostas={matcher.validation.faltamRespostas}
          onBack={() => matcher.goToStep("selecao")}
          onRun={matcher.execute}
          onSetPosicao={matcher.setPosicao}
          posicoes={state.posicoes}
          selected={state.selected}
        />
      ) : null}

      {state.step === "resultado" ? (
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
                onBack={() => matcher.goToStep("posicoes")}
                onEscopoChange={matcher.setEscopo}
                onLoadMore={matcher.loadMore}
                onCancelComparativoSelection={
                  matcher.cancelComparativoSelection
                }
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
      ) : null}

      {state.step === "comparativo" ? (
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
      ) : null}
    </section>
  );
}
