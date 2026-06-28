"use client";

import {
  MAX_POSICOES,
  MIN_POSICOES_COMPUTAVEIS,
} from "@vota-comigo/shared-types";
import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { useEffect, useRef, useState } from "react";

import { useMountTransition } from "@/shared/hooks/use-mount-transition";
import { Button } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

import { SelecaoResumo } from "./selecao-resumo";

const SHEET_DURATION = 240;

type SelecaoBottomBarProps = {
  selected: ProposicaoCard[];
  totalSelecionadas: number;
  canAdvance: boolean;
  atLimit: boolean;
  onToggle: (proposicao: ProposicaoCard) => void;
  onAdvance: () => void;
  onBack: () => void;
};

export function SelecaoBottomBar({
  selected,
  totalSelecionadas,
  canAdvance,
  atLimit,
  onToggle,
  onAdvance,
  onBack,
}: SelecaoBottomBarProps) {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { isMounted, isVisible } = useMountTransition(
    isSheetOpen,
    SHEET_DURATION,
  );
  const closeRef = useRef<HTMLButtonElement>(null);

  const faltam = Math.max(MIN_POSICOES_COMPUTAVEIS - totalSelecionadas, 0);
  const progresso = canAdvance
    ? `${totalSelecionadas} de até ${MAX_POSICOES} selecionadas`
    : `Faltam ${faltam} de ${MIN_POSICOES_COMPUTAVEIS} proposições`;

  useEffect(() => {
    if (!isMounted) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSheetOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMounted]);

  useEffect(() => {
    if (isVisible) closeRef.current?.focus();
  }, [isVisible]);

  return (
    <>
      {isMounted ? (
        <div
          aria-label="Sua seleção"
          aria-modal="true"
          className="fixed inset-0 z-20 lg:hidden"
          role="dialog"
        >
          <button
            aria-hidden="true"
            className={joinClassNames(
              "absolute inset-0 bg-ink/40 transition-opacity duration-[240ms] ease-standard motion-reduce:transition-none",
              isVisible ? "opacity-100" : "opacity-0",
            )}
            onClick={() => setSheetOpen(false)}
            tabIndex={-1}
            type="button"
          />
          <div
            className={joinClassNames(
              "absolute inset-x-0 bottom-0 grid max-h-[80vh] grid-rows-[auto_auto_minmax(0,1fr)] gap-3 rounded-t-lg border-t border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_oklch(0.205_0.012_48/0.12)] transition-transform duration-[240ms] ease-standard motion-reduce:transition-none",
              isVisible ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-[680] text-ink">Sua seleção</h2>
              <button
                className="-mr-1 rounded-md px-2 py-1 text-sm font-[650] text-muted transition-colors duration-[140ms] ease-standard hover:text-ink"
                onClick={() => setSheetOpen(false)}
                ref={closeRef}
                type="button"
              >
                Fechar
              </button>
            </div>
            <p className="text-sm leading-normal text-muted" role="status">
              {progresso}
            </p>
            <div className="min-h-0 overflow-y-auto">
              <SelecaoResumo
                listClassName="grid"
                onRemove={onToggle}
                selected={selected}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto grid w-full max-w-3xl gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <p
              className="min-w-0 truncate text-sm font-[650] text-ink"
              role="status"
            >
              {progresso}
            </p>
            {selected.length > 0 ? (
              <button
                className="shrink-0 text-sm font-[650] text-muted underline decoration-border underline-offset-2 transition-colors duration-[140ms] ease-standard hover:text-ink hover:decoration-current"
                onClick={() => setSheetOpen(true)}
                type="button"
              >
                Ver seleção
              </button>
            ) : null}
          </div>

          {atLimit ? (
            <p className="text-xs leading-snug text-muted">
              Limite de {MAX_POSICOES} atingido. Desmarque uma para trocar.
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button className="shrink-0" onClick={onBack} variant="secondary">
              Voltar
            </Button>
            <Button
              className="flex-1"
              disabled={!canAdvance}
              onClick={onAdvance}
              variant="primary"
            >
              Declarar posições
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
