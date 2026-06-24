"use client";

import type {
  EscopoMatcher,
  MatcherResultado,
} from "@vota-comigo/shared-types";

import {
  Button,
  ErrorState,
  SegmentedControl,
  SkeletonRows,
  Switch,
} from "@/shared/ui";

import type { MatcherState, MatcherStatus } from "../../lib/matcher-state";
import {
  canOpenComparativo,
  hasComparativoDeputadoLimit,
  isComparativoSelectionMode,
  isSemBomMatch,
  resultadoDisplay,
} from "../../lib/matcher-state";
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
  const compareAction = isSelectingComparativo ? (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
      <Button
        className="h-11 min-w-0 sm:h-auto"
        onClick={onCancelComparativoSelection}
        variant="ghost"
      >
        Cancelar
      </Button>
      <Button
        className="h-11 min-w-0 sm:h-auto"
        disabled={!canCompare}
        onClick={onOpenComparativo}
        variant="primary"
      >
        Comparar
      </Button>
    </div>
  ) : (
    <Button
      className="h-11 w-full min-w-0 !border-border-strong sm:h-auto sm:w-auto sm:shrink-0 sm:px-5"
      onClick={onStartComparativoSelection}
      variant="secondary"
    >
      Comparar deputados
    </Button>
  );
  const renderFilterControls = () => (
    <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
      <p className="text-sm font-[650] text-muted sm:hidden">Filtros</p>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:contents">
        <SegmentedControl
          activeId={escopo}
          className="order-1 col-span-full w-full sm:w-auto"
          itemClassName="flex-1 sm:flex-none"
          items={ESCOPO_ITEMS}
          label="Escopo dos resultados"
          onSelect={(id) => onEscopoChange(id as EscopoMatcher)}
        />
        <Switch
          checked={apenasEmAtividade}
          className="order-3 col-span-full h-11 min-w-0 justify-start rounded-md border border-border bg-white px-3 py-2.5 sm:order-2 sm:h-auto sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
          label="Apenas em atividade"
          onChange={(e) => onApenasEmAtividadeChange(e.target.checked)}
        />
      </div>
    </div>
  );
  const escopoControl = renderFilterControls();
  const resultadoControls = (
    <div className="grid min-w-0 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
      <div className="order-1 sm:order-2 sm:ml-auto">{compareAction}</div>
      <div className="order-2 sm:order-1">{renderFilterControls()}</div>
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
        <ResultadoVazio
          escopo={escopo}
          onBack={onBack}
          onEscopoChange={onEscopoChange}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {resultadoControls}
      {isSelectingComparativo ? (
        <div className="text-sm text-muted">
          {hasDeputadoLimit ? (
            <p>Você pode comparar até 3 deputados.</p>
          ) : (
            <p>Selecione 2 ou 3 deputados para comparar.</p>
          )}
        </div>
      ) : null}
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
          <Button
            disabled={status === "loading"}
            onClick={onLoadMore}
            variant="secondary"
          >
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
