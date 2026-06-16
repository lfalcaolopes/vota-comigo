"use client";

import type { PosicaoUsuarioMatcher } from "@vota-comigo/shared-types";
import type { KeyboardEvent } from "react";
import { useRef } from "react";

type Option = {
  posicao: PosicaoUsuarioMatcher;
  label: string;
  span: "half" | "full";
};

const OPTIONS: Option[] = [
  { posicao: "aprovar", label: "Sim", span: "half" },
  { posicao: "rejeitar", label: "Não", span: "half" },
  { posicao: "nao_sei", label: "Não sei", span: "full" },
];

const cardBase =
  "flex min-h-14 items-center gap-3 rounded-md border px-4 py-3 text-left text-sm font-[650] leading-snug text-ink transition-[background-color,border-color] duration-[180ms] ease-standard";

type PosicaoChoicesProps = {
  labelledBy: string;
  value: PosicaoUsuarioMatcher | undefined;
  onSelect: (posicao: PosicaoUsuarioMatcher) => void;
};

export function PosicaoChoices({
  labelledBy,
  value,
  onSelect,
}: PosicaoChoicesProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const checkedIndex = OPTIONS.findIndex((option) => option.posicao === value);
  const rovingIndex = checkedIndex === -1 ? 0 : checkedIndex;

  function focusAt(index: number) {
    const next = (index + OPTIONS.length) % OPTIONS.length;
    refs.current[next]?.focus();
  }

  // Arrows move focus only; selecting commits the answer and advances the
  // step, so selection must not follow focus the way a default radiogroup does.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      focusAt(index + 1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(index - 1);
    }
  }

  return (
    <div aria-labelledby={labelledBy} className="grid grid-cols-2 gap-3" role="radiogroup">
      {OPTIONS.map((option, index) => {
        const checked = option.posicao === value;

        return (
          <button
            aria-checked={checked}
            className={`${cardBase} ${option.span === "full" ? "col-span-2" : ""} ${
              checked
                ? "border-primary bg-primary-soft"
                : "border-border-strong bg-white hover:bg-surface-muted"
            }`}
            key={option.posicao}
            onClick={() => onSelect(option.posicao)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(node) => {
              refs.current[index] = node;
            }}
            role="radio"
            tabIndex={index === rovingIndex ? 0 : -1}
            type="button"
          >
            <Indicator checked={checked} />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Indicator({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-[1.125rem] shrink-0 place-items-center rounded-full border-2 transition-colors duration-[180ms] ease-standard ${
        checked ? "border-primary" : "border-border-strong"
      }`}
    >
      <span
        className={`size-2 rounded-full bg-primary transition-opacity duration-[180ms] ease-standard ${
          checked ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}
