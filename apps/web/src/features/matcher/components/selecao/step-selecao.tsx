"use client";

import {
  MAX_POSICOES,
  MIN_POSICOES_COMPUTAVEIS,
} from "@vota-comigo/shared-types";
import type {
  FeedOrdenacao,
  ProposicaoCard,
  TemaDisponivel,
} from "@vota-comigo/shared-types";
import { useState } from "react";

import type {
  FeedDisplay,
  FeedStatus,
  ProposicaoFeedFiltros,
} from "@/shared/proposicao";
import { FeedOrdenacaoControl, FeedSearch } from "@/shared/proposicao";
import { Button, InlineMessage } from "@/shared/ui";

import { SelecaoBottomBar } from "./selecao-bottom-bar";
import { SelecaoList } from "./selecao-list";
import { SelecaoResumo } from "./selecao-resumo";
import { SelecaoTemaControl } from "./selecao-tema-control";

type StepSelecaoProps = {
  items: ProposicaoCard[];
  total: number;
  status: FeedStatus;
  display: FeedDisplay;
  canLoadMore: boolean;
  query: string;
  filtros: ProposicaoFeedFiltros;
  temas: readonly TemaDisponivel[];
  selected: ProposicaoCard[];
  totalSelecionadas: number;
  canAdvance: boolean;
  onToggle: (proposicao: ProposicaoCard) => void;
  onSubmitSearch: (raw: string) => Promise<void>;
  onClearSearch: () => void;
  onApplyFiltros: (filtros: ProposicaoFeedFiltros) => Promise<void>;
  onClearTudo: () => Promise<void>;
  onLoadMore: () => Promise<void>;
  onBack: () => void;
  onAdvance: () => void;
};

export function StepSelecao({
  items,
  total,
  status,
  display,
  canLoadMore,
  query,
  filtros,
  temas,
  selected,
  totalSelecionadas,
  canAdvance,
  onToggle,
  onSubmitSearch,
  onClearSearch,
  onApplyFiltros,
  onClearTudo,
  onLoadMore,
  onBack,
  onAdvance,
}: StepSelecaoProps) {
  const [draft, setDraft] = useState("");

  const selectedIds = new Set(
    selected.map((card) => card.externalIdProposicao),
  );
  const atLimit = totalSelecionadas >= MAX_POSICOES;

  function handleClear() {
    setDraft("");
    onClearSearch();
  }

  function handleSearchSubmit() {
    const term = draft.trim();
    if (term.length === 0) {
      handleClear();
      return;
    }
    void onSubmitSearch(term);
  }

  async function handleClearTudo() {
    setDraft("");
    await onClearTudo();
  }

  function handleChangeOrdenacao(ordenacao: FeedOrdenacao) {
    void onApplyFiltros({ ...filtros, ordenacao });
  }

  function handleSelectTema(cod: number) {
    void onApplyFiltros({
      ...filtros,
      tema: filtros.tema === cod ? null : cod,
    });
  }

  const filterPanelClassName = "order-last sm:basis-full sm:shrink-0";
  const filterTriggerClassName =
    "w-full [&>button]:w-full [&>button]:justify-center [&>span]:w-full sm:w-auto sm:[&>button]:w-auto sm:[&>span]:w-auto";

  return (
    <div className="grid gap-5 pb-44 lg:pb-0">
      <div className="grid min-w-0 gap-4 sm:flex sm:flex-wrap sm:items-start sm:gap-2">
        <FeedSearch
          className="w-full sm:min-w-0 sm:flex-1"
          isSearching={query !== ""}
          onChange={setDraft}
          onClear={handleClear}
          onSubmit={handleSearchSubmit}
          query={query}
          value={draft}
        />

        <div className="grid min-w-0 gap-2 sm:contents">
          <p className="text-sm font-[650] text-muted sm:hidden">Filtros</p>
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:contents">
            <FeedOrdenacaoControl
              className="col-span-full w-full sm:w-auto sm:shrink-0"
              itemClassName="flex-1 sm:flex-none"
              onChange={handleChangeOrdenacao}
              value={filtros.ordenacao}
            />

            <SelecaoTemaControl
              activeTema={filtros.tema}
              onSelect={handleSelectTema}
              panelClassName={filterPanelClassName}
              spanToolbar
              temas={temas}
              triggerClassName={filterTriggerClassName}
            />

            <Button
              className="h-11 min-w-0 sm:hidden"
              disabled={status === "loading"}
              onClick={handleClearTudo}
              variant="secondary"
            >
              Limpar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-8">
        <aside className="hidden min-w-0 gap-5 rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:grid">
          <div className="grid gap-1">
            <h2 className="text-base font-[680] text-ink">Sua seleção</h2>
            <p className="text-sm leading-normal text-muted" role="status">
              {`${totalSelecionadas} de ${MAX_POSICOES} escolhidas`}
            </p>
            {canAdvance ? null : (
              <p className="text-sm leading-normal text-muted">
                {`Escolha pelo menos ${MIN_POSICOES_COMPUTAVEIS} para continuar.`}
              </p>
            )}
          </div>

          {atLimit ? (
            <InlineMessage
              body="Desmarque uma proposta para escolher outra."
              title={`Limite de ${MAX_POSICOES} atingido`}
            />
          ) : null}

          <SelecaoResumo selected={selected} onRemove={onToggle} />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={!canAdvance}
              onClick={onAdvance}
              variant="primary"
            >
              Declarar posições
            </Button>
            <Button onClick={onBack} variant="secondary">
              Voltar
            </Button>
          </div>
        </aside>

        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <SelecaoList
            atLimit={atLimit}
            canLoadMore={canLoadMore}
            display={display}
            items={items}
            onClearTudo={handleClearTudo}
            onLoadMore={onLoadMore}
            onToggle={onToggle}
            selectedIds={selectedIds}
            status={status}
            total={total}
          />
        </div>
      </div>

      <SelecaoBottomBar
        atLimit={atLimit}
        canAdvance={canAdvance}
        onAdvance={onAdvance}
        onBack={onBack}
        onToggle={onToggle}
        selected={selected}
        totalSelecionadas={totalSelecionadas}
      />
    </div>
  );
}
