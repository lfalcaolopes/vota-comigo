"use client";

import type { EscopoMatcher, MatcherResultado } from "@vota-comigo/shared-types";

import { Button, ErrorState, SegmentedControl, SkeletonRows, Switch } from "@/shared/ui";

import type { MatcherState, MatcherStatus } from "../lib/matcher-state";
import {
  canOpenComparativo,
  hasComparativoDeputadoLimit,
  isComparativoSelectionMode,
  isSemBomMatch,
  resultadoDisplay,
} from "../lib/matcher-state";
import { DeputadoCard } from "./deputado-card";
import { OrdenacaoDisclosure } from "./ordenacao-disclosure";
import { ResultadoVazio } from "./resultado-vazio";
import { SemBomMatchBanner } from "./sem-bom-match-banner";

const ESCOPO_ITEMS = [
  { id: "estadual", label: "Meu estado" },
  { id: "nacional", label: "Brasil" },
];

type StepResultadoProps = {
  state: MatcherState;
  status: MatcherStatus;
  resultado: MatcherResultado | null;
  escopo: EscopoMatcher;
  apenasEmAtividade: boolean;
  hasMore: boolean;
  onBack: () => void;
  onRetry: () => void;
  onEscopoChange: (escopo: EscopoMatcher) => void;
  onApenasEmAtividadeChange: (value: boolean) => void;
  onLoadMore: () => void;
  onOpenDetalhe: (externalIdDeputado: number) => void;
  onStartComparativoSelection: () => void;
  onToggleComparativoDeputado: (externalIdDeputado: number) => void;
  onCancelComparativoSelection: () => void;
  onOpenComparativo: () => void;
};

export function StepResultado({
  state,
  status,
  resultado,
  escopo,
  apenasEmAtividade,
  hasMore,
  onBack,
  onRetry,
  onEscopoChange,
  onApenasEmAtividadeChange,
  onLoadMore,
  onOpenDetalhe,
  onStartComparativoSelection,
  onToggleComparativoDeputado,
  onCancelComparativoSelection,
  onOpenComparativo,
}: StepResultadoProps) {
  const isSelectingComparativo = isComparativoSelectionMode(state);
  const canCompare = canOpenComparativo(state);
  const hasDeputadoLimit = hasComparativoDeputadoLimit(state);
  const escopoControl = (
    <div className="flex flex-wrap items-center gap-4">
      <SegmentedControl
        activeId={escopo}
        items={ESCOPO_ITEMS}
        label="Escopo dos resultados"
        onSelect={(id) => onEscopoChange(id as EscopoMatcher)}
      />
      <Switch
        checked={apenasEmAtividade}
        label="Apenas em atividade"
        onChange={(e) => onApenasEmAtividadeChange(e.target.checked)}
      />
    </div>
  );

  const display = resultadoDisplay(state);

  if (display === "loading") {
    return (
      <div className="grid gap-5">
        {escopoControl}
        <SkeletonRows count={5} />
      </div>
    );
  }

  if (display === "error") {
    return (
      <div className="grid gap-5">
        {escopoControl}
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (display === "empty") {
    return (
      <div className="grid gap-4">
        {escopoControl}
        <ResultadoVazio escopo={escopo} onBack={onBack} onEscopoChange={onEscopoChange} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {escopoControl}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {isSelectingComparativo ? (
            hasDeputadoLimit ? (
              <p>Você pode comparar até 3 deputados.</p>
            ) : (
              <p>Selecione 2 ou 3 deputados para comparar.</p>
            )
          ) : null}
        </div>
        {isSelectingComparativo ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={onCancelComparativoSelection} variant="ghost">
              Cancelar
            </Button>
            <Button
              disabled={!canCompare}
              onClick={onOpenComparativo}
              variant="primary"
            >
              Comparar
            </Button>
          </div>
        ) : (
          <Button onClick={onStartComparativoSelection} variant="secondary">
            Comparar deputados
          </Button>
        )}
      </div>
      {isSemBomMatch(resultado) && <SemBomMatchBanner />}
      <OrdenacaoDisclosure />

      <ul className="grid">
        {resultado!.deputados.map((deputado) => {
          const isSelected = state.selectedComparativoDeputados.some(
            (selected) =>
              selected.externalIdDeputado === deputado.externalIdDeputado,
          );

          return (
            <DeputadoCard
              comparativoSelection={
                isSelectingComparativo
                  ? {
                      disabled: hasDeputadoLimit && !isSelected,
                      onToggle: onToggleComparativoDeputado,
                      selected: isSelected,
                    }
                  : undefined
              }
              deputado={deputado}
              key={deputado.externalIdDeputado}
              onOpen={onOpenDetalhe}
              totalPosicoesComputaveis={resultado!.totalPosicoesComputaveis}
            />
          );
        })}
      </ul>

      {status === "error" ? (
        <div className="flex justify-center">
          <Button onClick={onLoadMore} variant="secondary">
            Tentar novamente
          </Button>
        </div>
      ) : hasMore ? (
        <div className="flex justify-center">
          <Button disabled={status === "loading"} onClick={onLoadMore} variant="secondary">
            {status === "loading" ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      ) : null}

      <div>
        <Button onClick={onBack}>Voltar</Button>
      </div>
    </div>
  );
}
