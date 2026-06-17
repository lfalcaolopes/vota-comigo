"use client";

import { MIN_POSICOES_COMPUTAVEIS } from "@vota-comigo/shared-types";
import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { useState } from "react";

import { ProposicaoRow } from "@/shared/proposicao";
import { Button, SourceLink } from "@/shared/ui";

import { PosicaoChoices } from "./posicao-choices";
import { StepRevisao } from "./step-revisao";

const QUESTION_ID = "matcher-posicao-pergunta";

type StepPosicoesProps = {
  selected: ProposicaoCard[];
  posicoes: Map<number, PosicaoUsuarioMatcher>;
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
      <div className={`${view === "revisao" ? "hidden lg:grid" : "grid"} gap-6`}>
        <div className="flex items-center justify-between gap-4">
          <Button onClick={goBack} variant="ghost">
            ← Voltar
          </Button>
          <p className="text-sm font-[650] tabular-nums text-muted">
            {index + 1} de {selected.length}
          </p>
        </div>

        <div className="grid gap-3">
          <ProposicaoRow card={card} />

          <SourceLink
            href={`/proposicoes/${card.externalIdProposicao}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Ver proposição
          </SourceLink>
        </div>

        <div className="grid gap-4">
          <p className="text-base font-[680] text-ink" id={QUESTION_ID}>
            Na sua opinião, deveria ser aprovada?
          </p>

          <PosicaoChoices
            labelledBy={QUESTION_ID}
            onSelect={(posicao) => {
              onSetPosicao(card.externalIdProposicao, posicao);
              goNext();
            }}
            value={current}
          />

          {faltamComputaveis > 0 ? (
            <p className="text-sm leading-normal text-muted lg:hidden" role="status">
              Responda Sim ou Não em pelo menos {MIN_POSICOES_COMPUTAVEIS}{" "}
              proposições para ver o resultado. Faltam{" "}
              <strong className="font-[720] text-ink">{faltamComputaveis}</strong>.
            </p>
          ) : null}

          <Button
            className="justify-self-start"
            onClick={goNext}
            variant="ghost"
          >
            Decidir depois
          </Button>
        </div>
      </div>

      <div
        className={`${view === "card" ? "hidden lg:block" : "block"} min-w-0 lg:sticky lg:top-24 lg:self-start lg:rounded-lg lg:border lg:border-border lg:bg-surface lg:p-5`}
      >
        <StepRevisao
          canRun={canRun}
          faltamComputaveis={faltamComputaveis}
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
