"use client";

import type { TemaDisponivel } from "@vota-comigo/shared-types";
import { useId, useState } from "react";

import { Chip } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

type FeedTemaControlProps = {
  temas: readonly TemaDisponivel[];
  activeTema: number | null;
  onSelect: (tema: number) => void;
  onClear?: () => void;
  className?: string;
  panelClassName?: string;
  spanToolbar?: boolean;
  triggerClassName?: string;
};

export function FeedTemaControl({
  temas,
  activeTema,
  onSelect,
  onClear,
  className,
  panelClassName,
  spanToolbar = false,
  triggerClassName,
}: FeedTemaControlProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);

  if (temas.length === 0) return null;

  const selectedTema = temas.find((t) => t.externalCodTema === activeTema);

  return (
    <div
      className={joinClassNames(
        spanToolbar ? "contents" : "grid min-w-0 gap-3",
        className,
      )}
    >
      <div
        className={joinClassNames(
          "flex min-w-0 flex-wrap items-center gap-2",
          triggerClassName,
        )}
      >
        {selectedTema ? (
          <span className="inline-flex h-11 max-w-full items-stretch overflow-hidden rounded-full border border-primary bg-primary-soft text-sm font-[650] leading-[1.2] text-ink transition-[background-color,border-color] duration-[180ms] ease-standard hover:border-primary-hover">
            <button
              aria-controls={listId}
              aria-expanded={isOpen}
              className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 px-3 py-2 text-center"
              onClick={() => setIsOpen((current) => !current)}
              type="button"
            >
              <span className="min-w-0 truncate">{selectedTema.tema}</span>
            </button>
            <button
              aria-label={`Limpar tema ${selectedTema.tema}`}
              className="inline-flex min-w-10 items-center justify-center border-l border-primary/35 px-2 transition-[background-color,color] duration-[180ms] ease-standard hover:bg-white"
              onClick={() => {
                setIsOpen(false);
                if (onClear) {
                  onClear();
                } else {
                  onSelect(selectedTema.externalCodTema);
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
            Temas
            <ChevronIcon open={isOpen} />
          </button>
        )}
      </div>

      {isOpen ? (
        <div
          aria-label="Filtrar por tema"
          className={joinClassNames(
            "col-span-full flex flex-wrap gap-2 rounded-md border border-border bg-surface px-3 py-3",
            panelClassName,
          )}
          id={listId}
          role="group"
        >
          {temas.map((t) => (
            <Chip
              key={t.externalCodTema}
              onClick={() => {
                onSelect(t.externalCodTema);
                setIsOpen(false);
              }}
              selected={activeTema === t.externalCodTema}
            >
              {t.tema}
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
