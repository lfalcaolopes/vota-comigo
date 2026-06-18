"use client";

import type { PartidoDisponivel } from "@vota-comigo/shared-types";
import { useId, useState } from "react";

import { Chip } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

type DeputadoPartidoControlProps = {
  partidos: readonly PartidoDisponivel[];
  activePartido: string | null;
  onSelect: (partido: string) => void;
  onClear?: () => void;
  className?: string;
};

export function DeputadoPartidoControl({
  partidos,
  activePartido,
  onSelect,
  onClear,
  className,
}: DeputadoPartidoControlProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);

  if (partidos.length === 0) return null;

  return (
    <div className={joinClassNames("contents", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {activePartido ? (
          <span className="inline-flex h-11 max-w-full items-stretch overflow-hidden rounded-full border border-primary bg-primary-soft text-sm font-[650] leading-[1.2] text-ink transition-[background-color,border-color] duration-[180ms] ease-standard hover:border-primary-hover">
            <button
              aria-controls={listId}
              aria-expanded={isOpen}
              className="inline-flex min-w-0 items-center gap-2 px-3 py-2 text-left"
              onClick={() => setIsOpen((current) => !current)}
              type="button"
            >
              <span className="min-w-0 truncate">{activePartido}</span>
            </button>
            <button
              aria-label={`Limpar filtro de partido ${activePartido}`}
              className="inline-flex min-w-10 items-center justify-center border-l border-primary/35 px-2 transition-[background-color,color] duration-[180ms] ease-standard hover:bg-white"
              onClick={() => {
                setIsOpen(false);
                if (onClear) {
                  onClear();
                } else {
                  onSelect(activePartido);
                }
              }}
              type="button"
            >
              <ClearIcon />
            </button>
          </span>
        ) : (
          <button
            aria-controls={listId}
            aria-expanded={isOpen}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-[650] leading-[1.2] text-ink transition-[background-color,border-color] duration-[180ms] ease-standard hover:border-border-strong hover:bg-surface-muted"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            Partido
            <ChevronIcon open={isOpen} />
          </button>
        )}
      </div>

      {isOpen ? (
        <div
          aria-label="Filtrar por partido"
          className="col-span-full flex flex-wrap gap-2 rounded-md border border-border bg-surface px-3 py-3"
          id={listId}
          role="group"
        >
          {partidos.map((partido) => (
            <Chip
              key={partido.siglaPartido}
              onClick={() => {
                onSelect(partido.siglaPartido);
                setIsOpen(false);
              }}
              selected={activePartido === partido.siglaPartido}
            >
              {partido.siglaPartido}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={joinClassNames(
        "size-4 shrink-0 text-muted transition-transform duration-[180ms] ease-standard",
        open && "rotate-180",
      )}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m5 7.5 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
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
