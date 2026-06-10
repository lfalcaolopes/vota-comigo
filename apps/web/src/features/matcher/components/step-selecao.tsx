"use client";

import { MAX_POSICOES } from "@vota-comigo/shared-types";
import type { ProposicaoCard } from "@vota-comigo/shared-types";

import { ProposicaoRow } from "@/shared/proposicao";
import { Button } from "@/shared/ui";

type StepSelecaoProps = {
  candidates: ProposicaoCard[];
  selected: ProposicaoCard[];
  onToggle: (proposicao: ProposicaoCard) => void;
  onBack: () => void;
  onAdvance: () => void;
};

export function StepSelecao({
  candidates,
  selected,
  onToggle,
  onBack,
  onAdvance,
}: StepSelecaoProps) {
  const selectedIds = new Set(
    selected.map((card) => card.externalIdProposicao),
  );
  const atLimit = selected.length >= MAX_POSICOES;

  return (
    <div className="grid gap-5">
      <p className="text-sm leading-normal text-muted">
        As cinco mais bem posicionadas já vêm marcadas. Você pode desmarcar ou
        incluir outras. Selecionadas: {selected.length} de até {MAX_POSICOES}.
      </p>

      <ul className="grid">
        {candidates.map((card) => {
          const isSelected = selectedIds.has(card.externalIdProposicao);
          const disabled = !isSelected && atLimit;
          return (
            <li
              className="flex items-start gap-3 border-b border-border py-1"
              key={card.externalIdProposicao}
            >
              <input
                aria-label={`Selecionar proposição ${card.externalIdProposicao}`}
                checked={isSelected}
                className="mt-6 size-4.5 accent-primary"
                disabled={disabled}
                onChange={() => onToggle(card)}
                type="checkbox"
              />
              <div className="min-w-0 flex-1">
                <ProposicaoRow card={card} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onBack} variant="secondary">
          Voltar
        </Button>
        <Button
          disabled={selected.length === 0}
          onClick={onAdvance}
          variant="primary"
        >
          Declarar posições
        </Button>
      </div>
    </div>
  );
}
