"use client";

import { MIN_POSICOES_COMPUTAVEIS } from "@vota-comigo/shared-types";
import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
  ProposicaoDetalhe,
} from "@vota-comigo/shared-types";
import { useState } from "react";

import {
  EmentaDetalhada,
  EmentaOficial,
  LinksOficiais,
  ResumoIa,
  TemasOficiais,
  toIdentificadorLegislativo,
} from "@/shared/proposicao";
import { Button, ErrorState, SkeletonRows } from "@/shared/ui";

import { useProposicaoDetalhe } from "../../hooks/use-proposicao-detalhe";
import { PosicaoChoices } from "./posicao-choices";
import { StepRevisao } from "./step-revisao";

const QUESTION_ID = "matcher-posicao-pergunta";

type StepPosicoesProps = {
  selected: ProposicaoCard[];
  posicoes: Map<number, PosicaoUsuarioMatcher>;
  faltamRespostas: number;
  faltamComputaveis: number;
  canRun: boolean;
  onSetPosicao: (
    externalIdProposicao: number,
    posicao: PosicaoUsuarioMatcher,
  ) => void;
  onBack: () => void;
  onRun: () => void;
};

type View = "card" | "revisao";

export function StepPosicoes({
  selected,
  posicoes,
  faltamRespostas,
  faltamComputaveis,
  canRun,
  onSetPosicao,
  onBack,
  onRun,
}: StepPosicoesProps) {
  const [view, setView] = useState<View>("card");
  const [index, setIndex] = useState(0);

  if (selected.length === 0) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <p className="text-sm text-muted">Nenhuma proposição selecionada.</p>
        <Button className="justify-self-start" onClick={onBack}>
          Voltar
        </Button>
      </div>
    );
  }

  const card = selected[index];
  const isFirst = index === 0;
  const isLast = index === selected.length - 1;
  const current = posicoes.get(card.externalIdProposicao);

  // On mobile the review replaces the card as a final step; from lg up both
  // panes are always shown, so advancing past the last card is a visual no-op.
  function goNext() {
    if (isLast) {
      setView("revisao");
    } else {
      setIndex((v) => v + 1);
    }
  }

  function goBack() {
    if (isFirst) {
      onBack();
    } else {
      setIndex((v) => v - 1);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-8">
      <div
        className={`${view === "revisao" ? "hidden lg:grid" : "grid"} gap-6`}
      >
        <div className="flex items-center justify-between gap-4">
          <Button onClick={goBack} variant="ghost">
            ← Voltar
          </Button>
          <p className="text-sm font-[650] tabular-nums text-muted">
            {index + 1} de {selected.length}
          </p>
        </div>

        <ProposicaoPosicao
          card={card}
          current={current}
          faltamComputaveis={faltamComputaveis}
          faltamRespostas={faltamRespostas}
          onSelect={(posicao) => {
            onSetPosicao(card.externalIdProposicao, posicao);
            goNext();
          }}
        />
      </div>

      <div
        className={`${view === "card" ? "hidden lg:block" : "block"} min-w-0 lg:sticky lg:top-24 lg:self-start lg:rounded-lg lg:border lg:border-border lg:bg-surface lg:p-5`}
      >
        <StepRevisao
          canRun={canRun}
          faltamComputaveis={faltamComputaveis}
          faltamRespostas={faltamRespostas}
          highlightIndex={index}
          onBack={() => {
            setIndex(selected.length - 1);
            setView("card");
          }}
          onEditar={(editIndex) => {
            setIndex(editIndex);
            setView("card");
          }}
          onRun={onRun}
          posicoes={posicoes}
          selected={selected}
        />
      </div>
    </div>
  );
}

type ProposicaoPosicaoProps = {
  card: ProposicaoCard;
  current: PosicaoUsuarioMatcher | undefined;
  faltamRespostas: number;
  faltamComputaveis: number;
  onSelect: (posicao: PosicaoUsuarioMatcher) => void;
};

function ProposicaoPosicao({
  card,
  current,
  faltamRespostas,
  faltamComputaveis,
  onSelect,
}: ProposicaoPosicaoProps) {
  const { detalhe, status, retry } = useProposicaoDetalhe(
    card.externalIdProposicao,
  );

  if (status === "loading") {
    return <SkeletonRows count={6} />;
  }

  if (status === "error" || !detalhe) {
    return <ErrorState onRetry={retry} />;
  }

  return (
    <PosicaoConteudo
      current={current}
      detalhe={detalhe}
      faltamComputaveis={faltamComputaveis}
      faltamRespostas={faltamRespostas}
      onSelect={onSelect}
    />
  );
}

type PosicaoConteudoProps = {
  detalhe: ProposicaoDetalhe;
  current: PosicaoUsuarioMatcher | undefined;
  faltamRespostas: number;
  faltamComputaveis: number;
  onSelect: (posicao: PosicaoUsuarioMatcher) => void;
};

export function PosicaoConteudo({
  detalhe,
  current,
  faltamRespostas,
  faltamComputaveis,
  onSelect,
}: PosicaoConteudoProps) {
  const identificador = toIdentificadorLegislativo(detalhe);
  const temResumoIa = Boolean(
    detalhe.resumoIaDisponivel && detalhe.resumoIaDetalhe,
  );

  return (
    <div className="grid gap-6">
      <div className="grid min-w-0 gap-6">
        <h2 className="font-mono text-base font-[650] tracking-[-0.01em] text-ink md:text-lg">
          {identificador ?? "Sem identificador"}
        </h2>

        <TemasOficiais temas={detalhe.temas} />

        <LinksOficiais
          fonteOficial={detalhe.fonteOficial}
          camaraPollResultsUrl={detalhe.camaraPollResultsUrl}
          urlInteiroTeor={detalhe.urlInteiroTeor}
        />

        {temResumoIa ? <ResumoIa proposicao={detalhe} /> : null}

        {detalhe.ementa ? (
          <EmentaOficial ementa={detalhe.ementa} prominent={!temResumoIa} />
        ) : null}

        {detalhe.ementaDetalhada ? (
          <EmentaDetalhada ementaDetalhada={detalhe.ementaDetalhada} />
        ) : null}
      </div>

      <div className="grid gap-4 border-t border-border pt-6">
        <p className="text-base font-[680] text-ink" id={QUESTION_ID}>
          Na sua opinião, deveria ser aprovada?
        </p>

        <PosicaoChoices
          labelledBy={QUESTION_ID}
          onSelect={onSelect}
          value={current}
        />

        {faltamRespostas > 0 ? (
          <p
            className="text-sm leading-normal text-muted lg:hidden"
            role="status"
          >
            Responda todas as proposições selecionadas para ver o resultado.
            Faltam{" "}
            <strong className="font-[720] text-ink">{faltamRespostas}</strong>.
          </p>
        ) : faltamComputaveis > 0 ? (
          <p
            className="text-sm leading-normal text-muted lg:hidden"
            role="status"
          >
            Responda Sim ou Não em pelo menos {MIN_POSICOES_COMPUTAVEIS}{" "}
            proposições para ver o resultado. Faltam{" "}
            <strong className="font-[720] text-ink">{faltamComputaveis}</strong>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
