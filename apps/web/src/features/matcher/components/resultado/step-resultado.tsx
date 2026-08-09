"use client";

import type {
  EscopoMatcher,
  MatcherResultado,
} from "@vota-comigo/shared-types";
import { useId, useRef, useState } from "react";

import {
  Button,
  Checkbox,
  ErrorState,
  SegmentedControl,
  SkeletonRows,
  Switch,
} from "@/shared/ui";
import { ProposicoesSelecionadasList } from "@/shared/proposicao";

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
import { ResultadoFiltroConcordanciaVazio } from "./resultado-filtro-concordancia-vazio";
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
  externalIdProposicoesFiltroConcordancia: readonly number[];
  hasMore: boolean;
  onRetry: () => void;
  onEscopoChange: (escopo: EscopoMatcher) => void;
  onApenasEmAtividadeChange: (value: boolean) => void;
  onClearFiltroConcordancia: () => void;
  onToggleFiltroConcordancia: (externalIdProposicao: number) => void;
  onLoadMore: () => void;
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
  externalIdProposicoesFiltroConcordancia,
  hasMore,
  onRetry,
  onEscopoChange,
  onApenasEmAtividadeChange,
  onClearFiltroConcordancia,
  onToggleFiltroConcordancia,
  onLoadMore,
  onStartComparativoSelection,
  onToggleComparativoDeputado,
  onCancelComparativoSelection,
  onOpenComparativo,
}: StepResultadoProps) {
  const filtroPanelId = useId();
  const filtroTriggerRef = useRef<HTMLButtonElement>(null);
  const [isFiltroOpen, setIsFiltroOpen] = useState(false);
  const isSelectingComparativo = isComparativoSelectionMode(state);
  const canCompare = canOpenComparativo(state);
  const hasDeputadoLimit = hasComparativoDeputadoLimit(state);
  const proposicoesElegiveis = state.selected.filter((card) => {
    const posicao = state.posicoes.get(card.externalIdProposicao);
    return posicao === "aprovar" || posicao === "rejeitar";
  });
  const proposicoesMarcadas = proposicoesElegiveis.filter((card) =>
    externalIdProposicoesFiltroConcordancia.includes(card.externalIdProposicao),
  );
  const display = resultadoDisplay(state);
  const filtroCountLabel =
    externalIdProposicoesFiltroConcordancia.length === 1
      ? "1 proposição marcada"
      : `${externalIdProposicoesFiltroConcordancia.length} proposições marcadas`;
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
    <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:items-start sm:gap-4">
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
        <div className="order-4 col-span-full grid gap-1 sm:order-3 sm:w-80">
          <div className="rounded-md border border-border bg-white px-3 py-2">
            <button
              aria-controls={filtroPanelId}
              aria-expanded={isFiltroOpen}
              aria-label={`Votou comigo, ${filtroCountLabel}`}
              className="cursor-pointer text-sm font-[650] text-ink"
              onClick={() => setIsFiltroOpen((isOpen) => !isOpen)}
              ref={filtroTriggerRef}
              type="button"
            >
              Votou comigo
              {externalIdProposicoesFiltroConcordancia.length > 0
                ? ` (${externalIdProposicoesFiltroConcordancia.length})`
                : ""}
            </button>
            <div hidden={!isFiltroOpen} id={filtroPanelId}>
              <ProposicoesSelecionadasList
                ariaLabel="Proposições do filtro de concordância"
                className="mt-3 max-h-[min(55vh,24rem)] overflow-y-auto pr-1"
                posicoes={state.posicoes}
                proposicoes={proposicoesElegiveis}
                renderAction={(proposicao, _index, identificador) => (
                  <Checkbox
                    checked={externalIdProposicoesFiltroConcordancia.includes(
                      proposicao.externalIdProposicao,
                    )}
                    className="size-11 justify-center"
                    hideLabel
                    label={`Exigir concordância em ${identificador}`}
                    onChange={() =>
                      onToggleFiltroConcordancia(
                        proposicao.externalIdProposicao,
                      )
                    }
                  />
                )}
              />
              <Button
                className="mt-2"
                onClick={() => {
                  setIsFiltroOpen(false);
                  filtroTriggerRef.current?.focus();
                }}
                variant="ghost"
              >
                Fechar filtro
              </Button>
            </div>
          </div>
          {externalIdProposicoesFiltroConcordancia.length > 0 ? (
            <Button
              className="justify-self-start"
              onClick={() => {
                onClearFiltroConcordancia();
                filtroTriggerRef.current?.focus();
              }}
              variant="ghost"
            >
              Limpar filtro
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
  const resultadoControls = (
    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4">
      <div className="order-1 sm:order-2 sm:ml-auto">
        {display === "results" ? compareAction : null}
      </div>
      <div className="order-2 sm:order-1">{renderFilterControls()}</div>
    </div>
  );

  const resultadoAnnouncement =
    display === "loading"
      ? "Atualizando lista de deputados."
      : display === "error"
        ? "Não foi possível atualizar a lista de deputados."
        : display === "empty" &&
            externalIdProposicoesFiltroConcordancia.length > 0
          ? "Resultado atualizado: nenhum deputado votou com você em todas as proposições marcadas."
          : display === "empty"
            ? "Resultado atualizado: nenhum deputado encontrado."
            : resultado!.total === 1
              ? "Resultado atualizado: 1 deputado no resultado."
              : `Resultado atualizado: ${resultado!.total} deputados no resultado.`;
  const resultadoStatus = (
    <p aria-atomic="true" className="sr-only" role="status">
      {resultadoAnnouncement}
    </p>
  );

  if (display === "loading") {
    return (
      <div className="grid gap-5">
        {resultadoStatus}
        {resultadoControls}
        <SkeletonRows count={5} />
      </div>
    );
  }

  if (display === "error") {
    return (
      <div className="grid gap-5">
        {resultadoStatus}
        {resultadoControls}
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (display === "empty") {
    return (
      <div className="grid gap-4">
        {resultadoStatus}
        {resultadoControls}
        {externalIdProposicoesFiltroConcordancia.length > 0 ? (
          <ResultadoFiltroConcordanciaVazio
            escopo={escopo}
            onEscopoChange={onEscopoChange}
            onToggleProposicao={onToggleFiltroConcordancia}
            posicoes={state.posicoes}
            proposicoes={proposicoesMarcadas}
          />
        ) : (
          <ResultadoVazio escopo={escopo} onEscopoChange={onEscopoChange} />
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {resultadoStatus}
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
      {externalIdProposicoesFiltroConcordancia.length > 0 ? (
        <header aria-live="polite" className="grid gap-1">
          <h2 className="text-base font-[680] text-ink">
            Deputados que votaram com você nas proposições marcadas
          </h2>
          <p className="text-sm text-muted">
            Resultado restrito à concordância em todas as proposições marcadas.
            A compatibilidade continua considerando todas as suas posições.
          </p>
        </header>
      ) : null}
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
    </div>
  );
}
