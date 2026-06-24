"use client";

import type { UfDisponivel } from "@vota-comigo/shared-types";
import { useId, useState } from "react";

import { Chip } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

import { toEstadoLabel } from "./presentation";

type DeputadoUfControlProps = {
  ufs: readonly UfDisponivel[];
  activeUf: string | null;
  onSelect: (uf: string) => void;
  onClear?: () => void;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  panelClassName?: string;
  triggerClassName?: string;
};

export function DeputadoUfControl({
  ufs,
  activeUf,
  onSelect,
  onClear,
  className,
  open,
  onOpenChange,
  panelClassName,
  triggerClassName,
}: DeputadoUfControlProps) {
  const listId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const activeEstadoLabel = activeUf ? toEstadoLabel(activeUf) : null;

  function setIsOpen(next: boolean) {
    if (open === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  }

  if (ufs.length === 0) return null;

  return (
    <div className={joinClassNames("contents", className)}>
      <div
        className={joinClassNames(
          "flex min-w-0 flex-wrap items-center gap-2",
          triggerClassName,
        )}
      >
        {activeUf ? (
          <span className="inline-flex h-11 max-w-full items-stretch overflow-hidden rounded-full border border-primary bg-primary-soft text-sm font-[650] leading-[1.2] text-ink transition-[background-color,border-color] duration-[180ms] ease-standard hover:border-primary-hover">
            <button
              aria-controls={listId}
              aria-expanded={isOpen}
              className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 px-3 py-2 text-center"
              onClick={() => setIsOpen(!isOpen)}
              type="button"
            >
              <span className="min-w-0 truncate">{activeEstadoLabel}</span>
            </button>
            <button
              aria-label={`Limpar filtro de estado ${activeEstadoLabel}`}
              className="inline-flex min-w-10 items-center justify-center border-l border-primary/35 px-2 transition-[background-color,color] duration-[180ms] ease-standard hover:bg-white"
              onClick={() => {
                setIsOpen(false);
                if (onClear) {
                  onClear();
                } else {
                  onSelect(activeUf);
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
            onClick={() => setIsOpen(!isOpen)}
            type="button"
          >
            Estado
            <ChevronIcon open={isOpen} />
          </button>
        )}
      </div>

      {isOpen ? (
        <div
          aria-label="Filtrar por estado"
          className={joinClassNames(
            "col-span-full flex flex-wrap gap-2 rounded-md border border-border bg-surface px-3 py-3",
            panelClassName,
          )}
          id={listId}
          role="group"
        >
          {ufs.map((uf) => {
            const estadoLabel = toEstadoLabel(uf.siglaUf);

            return (
              <Chip
                key={uf.siglaUf}
                onClick={() => {
                  onSelect(uf.siglaUf);
                  setIsOpen(false);
                }}
                selected={activeUf === uf.siglaUf}
              >
                {estadoLabel}
              </Chip>
            );
          })}
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
