"use client";

import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { useState } from "react";

import { ProposicaoRow } from "@/shared/proposicao";
import { Button, SourceLink } from "@/shared/ui";

import { StepRevisao } from "./step-revisao";

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

const OPTIONS: { posicao: PosicaoUsuarioMatcher; label: string }[] = [
  { posicao: "aprovar", label: "Sim, deveria ser aprovada" },
  { posicao: "rejeitar", label: "Não deveria ser aprovada" },
  { posicao: "nao_sei", label: "Não sei · não entra no cálculo" },
];

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
      <div className="grid gap-4">
        <p className="text-sm text-muted">Nenhuma proposição selecionada.</p>
        <Button className="justify-self-start" onClick={onBack}>
          Voltar
        </Button>
      </div>
    );
  }

  if (view === "revisao") {
    return (
      <StepRevisao
        canRun={canRun}
        faltamComputaveis={faltamComputaveis}
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
    );
  }

  const card = selected[index];
  const isFirst = index === 0;
  const isLast = index === selected.length - 1;
  const current = posicoes.get(card.externalIdProposicao);

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
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <Button onClick={goBack} variant="ghost">
          ← Voltar
        </Button>
        <p className="text-sm font-[650] text-muted">
          {index + 1} de {selected.length}
        </p>
      </div>

      <ProposicaoRow card={card} />

      <SourceLink
        href={`/proposicoes/${card.externalIdProposicao}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        Ver proposição
      </SourceLink>

      <p className="text-base font-[680] text-ink">
        Na sua opinião, deveria ser aprovada?
      </p>

      <div className="grid gap-2">
        {OPTIONS.map((option) => (
          <Button
            aria-pressed={current === option.posicao}
            className="justify-start aria-pressed:border-primary aria-pressed:bg-primary-soft"
            key={option.posicao}
            onClick={() => {
              onSetPosicao(card.externalIdProposicao, option.posicao);
              goNext();
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <Button className="justify-self-start" onClick={goNext} variant="ghost">
        Pular por enquanto
      </Button>
    </div>
  );
}
