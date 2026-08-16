"use client";

import {
  MAX_POSICOES,
  MIN_POSICOES_COMPUTAVEIS,
} from "@vota-comigo/shared-types";
import type { ProposicaoCard, TemaDisponivel } from "@vota-comigo/shared-types";
import { useState } from "react";

import type {
  FeedDisplay,
  FeedStatus,
  ProposicaoFeedFiltros,
} from "@/shared/proposicao";
import { ProposicaoFiltrosBar } from "@/shared/proposicao";
import { Button, InlineMessage } from "@/shared/ui";

import { SelecaoBottomBar } from "./selecao-bottom-bar";
import { SelecaoList } from "./selecao-list";
import { SelecaoResumo } from "./selecao-resumo";

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

  return (
    <div className="grid gap-5 pb-44 lg:pb-0">
      <ProposicaoFiltrosBar
        draft={draft}
        filtros={filtros}
        onApplyFiltros={onApplyFiltros}
        onClearSearch={handleClear}
        onDraftChange={setDraft}
        onSearch={handleSearchSubmit}
        query={query}
        temas={temas}
      />

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
