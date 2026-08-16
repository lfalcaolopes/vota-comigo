"use client";

import { Chip } from "./selection";
import { joinClassNames } from "./utils";

export type ChipGroupOption<Valor extends string> = {
  valor: Valor;
  label: string;
};

type ChipGroupProps<Valor extends string> = {
  label: string;
  options: readonly ChipGroupOption<Valor>[];
  selecionados: readonly Valor[];
  onToggle: (valor: Valor) => void;
  className?: string;
};

export function ChipGroup<Valor extends string>({
  label,
  options,
  selecionados,
  onToggle,
  className,
}: ChipGroupProps<Valor>) {
  if (options.length === 0) return null;

  return (
    <div
      aria-label={label}
      className={joinClassNames("flex flex-wrap gap-2", className)}
      role="group"
    >
      {options.map((option) => (
        <Chip
          key={option.valor}
          onClick={() => onToggle(option.valor)}
          selected={selecionados.includes(option.valor)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
