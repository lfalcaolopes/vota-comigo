"use client";

import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { useState } from "react";

import { ProposicaoRow } from "@/shared/proposicao";
import { Button, ButtonLink } from "@/shared/ui";

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
  { posicao: "aprovar", label: "Deveria ser aprovada" },
  { posicao: "rejeitar", label: "Não deveria ser aprovada" },
  { posicao: "nao_sei", label: "Não sei" },
];

export function StepPosicoes({
  selected,
  posicoes,
  faltamComputaveis,
  canRun,
  onSetPosicao,
  onBack,
  onRun,
}: StepPosicoesProps) {
  const [index, setIndex] = useState(0);
  const card = selected[index];
  const isLast = index === selected.length - 1;

  if (!card) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted">Nenhuma proposição selecionada.</p>
        <Button className="justify-self-start" onClick={onBack}>
          Voltar
        </Button>
      </div>
    );
  }

  const current = posicoes.get(card.externalIdProposicao);

  function advance() {
    if (isLast) return;
    setIndex((value) => value + 1);
  }

  return (
    <div className="grid gap-5">
      <p className="text-sm font-[650] text-muted">
        Proposição {index + 1} de {selected.length}
      </p>

      <ProposicaoRow card={card} />

      <ButtonLink
        className="justify-self-start"
        href={`/proposicoes/${card.externalIdProposicao}`}
        variant="ghost"
      >
        Ver proposição
      </ButtonLink>

      <div className="grid gap-2">
        {OPTIONS.map((option) => (
          <Button
            aria-pressed={current === option.posicao}
            className="justify-start aria-pressed:border-primary aria-pressed:bg-primary-soft"
            key={option.posicao}
            onClick={() => {
              onSetPosicao(card.externalIdProposicao, option.posicao);
              advance();
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={index === 0 ? onBack : () => setIndex((v) => v - 1)}>
          Voltar
        </Button>
        {!isLast ? (
          <Button onClick={advance} variant="ghost">
            Pular
          </Button>
        ) : null}
        {isLast ? (
          <Button disabled={!canRun} onClick={onRun} variant="primary">
            Ver resultado
          </Button>
        ) : null}
      </div>

      {!canRun && faltamComputaveis > 0 ? (
        <p className="text-sm text-muted">
          Faltam {faltamComputaveis} {faltamComputaveis > 1 ? "posições " : "posição "} entre &quot;aprovar&quot; e &quot;não deveria&quot; para ver o resultado.
        </p>
      ) : null}
    </div>
  );
}
