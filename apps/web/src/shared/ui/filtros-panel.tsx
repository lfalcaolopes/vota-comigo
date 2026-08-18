"use client";

import type { ReactNode } from "react";
import { useId, useRef, useState } from "react";

import { Button } from "./button";
import { ChevronDownIcon } from "./chevron-down-icon";
import { Popover } from "./popover";
import type { PopoverAlign } from "./popover-position";
import { joinClassNames } from "./utils";

type FiltrosPanelProps = {
  total: number;
  align?: PopoverAlign;
  children: ReactNode;
  onOpen: () => void;
  onApply: () => void;
  onLimpar: () => void;
  isApplyDisabled: boolean;
  isLimparDisabled: boolean;
  className?: string;
  width?: number;
};

export function FiltrosPanel({
  total,
  align = "end",
  children,
  onOpen,
  onApply,
  onLimpar,
  isApplyDisabled,
  isLimparDisabled,
  className,
  width = 400,
}: FiltrosPanelProps) {
  const panelId = useId();
  const tituloId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  function abrir() {
    onOpen();
    setIsOpen(true);
  }

  function aplicar() {
    setIsOpen(false);
    onApply();
  }

  return (
    <>
      <button
        aria-controls={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={joinClassNames(
          "inline-flex h-11 w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-[650] leading-[1.2] text-ink transition-[background-color,border-color] duration-[180ms] ease-standard hover:border-border-strong hover:bg-surface-muted sm:w-auto",
          className,
        )}
        onClick={() => (isOpen ? setIsOpen(false) : abrir())}
        ref={triggerRef}
        type="button"
      >
        Filtros
        {total > 0 ? (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-white">
            {total}
          </span>
        ) : null}
        <ChevronDownIcon
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform duration-[180ms] ease-standard ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <Popover
        align={align}
        ariaLabelledBy={tituloId}
        id={panelId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        width={width}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
          <h2 className="text-sm font-[680] text-ink" id={tituloId}>
            Filtros
          </h2>
          <button
            aria-label="Fechar filtros"
            className="-m-1 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md p-1 text-muted transition-colors duration-[180ms] ease-standard hover:bg-surface-muted hover:text-ink"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="grid gap-5 px-4 py-4">{children}</div>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border bg-white px-4 py-3">
          <Button
            disabled={isLimparDisabled}
            onClick={onLimpar}
            variant="ghost"
          >
            Limpar seleção
          </Button>
          <Button
            disabled={isApplyDisabled}
            onClick={aplicar}
            variant="primary"
          >
            Aplicar
          </Button>
        </div>
      </Popover>
    </>
  );
}

export function FiltroSecao({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-[650] text-ink">{titulo}</h3>
      {children}
    </section>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 14 14"
      width="14"
    >
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}
