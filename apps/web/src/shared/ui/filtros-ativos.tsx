"use client";

import type { FiltroAtivo } from "./filtro-descritor";

type FiltrosAtivosProps<Id extends string> = {
  ativos: readonly FiltroAtivo<Id>[];
  onRemove: (id: Id) => void;
  onClear: () => void;
};

export function FiltrosAtivos<Id extends string>({
  ativos,
  onRemove,
  onClear,
}: FiltrosAtivosProps<Id>) {
  if (ativos.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <ul className="flex min-w-0 flex-wrap gap-2">
        {ativos.map((filtro) => (
          <li key={filtro.id}>
            <button
              aria-label={filtro.removeLabel}
              className="inline-flex min-h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-primary bg-primary-soft px-3 py-1 text-sm font-[650] leading-[1.2] text-ink transition-[background-color,border-color] duration-[180ms] ease-standard hover:border-primary-hover hover:bg-white"
              onClick={() => onRemove(filtro.id)}
              type="button"
            >
              <span className="min-w-0 truncate">{filtro.label}</span>
              <ClearIcon />
            </button>
          </li>
        ))}
      </ul>

      <button
        className="ml-auto cursor-pointer text-sm font-[650] text-muted underline decoration-border underline-offset-2 transition-colors duration-[140ms] ease-standard hover:text-ink hover:decoration-current"
        onClick={onClear}
        type="button"
      >
        Limpar filtros
      </button>
    </div>
  );
}

function ClearIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5 shrink-0 text-muted"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m6 6 8 8m0-8-8 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
