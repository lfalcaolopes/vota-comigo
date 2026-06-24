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

import type { FeedDisplay, FeedStatus } from "@/shared/proposicao";
import {
  FeedOrdenacaoControl,
  FeedSearch,
  FeedTemaControl,
  toIdentificadorLegislativo,
  toTextoResumo,
} from "@/shared/proposicao";
import { Button, InlineMessage } from "@/shared/ui";

import { SelecaoList } from "./selecao-list";

type StepSelecaoProps = {
  items: ProposicaoCard[];
  total: number;
  status: FeedStatus;
  display: FeedDisplay;
  canLoadMore: boolean;
  query: string;
  ordenacao: FeedOrdenacao;
  tema: number | null;
  temas: readonly TemaDisponivel[];
  selected: ProposicaoCard[];
  totalSelecionadas: number;
  canAdvance: boolean;
  onToggle: (proposicao: ProposicaoCard) => void;
  onSubmitSearch: (raw: string) => Promise<void>;
  onClearSearch: () => void;
  onChangeOrdenacao: (value: FeedOrdenacao) => Promise<void>;
  onChangeTema: (cod: number) => void;
  onClearFilters: () => Promise<void>;
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
  ordenacao,
  tema,
  temas,
  selected,
  totalSelecionadas,
  canAdvance,
  onToggle,
  onSubmitSearch,
  onClearSearch,
  onChangeOrdenacao,
  onChangeTema,
  onClearFilters,
  onLoadMore,
  onBack,
  onAdvance,
}: StepSelecaoProps) {
  const [draft, setDraft] = useState("");

  const selectedIds = new Set(
    selected.map((card) => card.externalIdProposicao),
  );
  const atLimit = totalSelecionadas >= MAX_POSICOES;
  const faltamSelecionadas = Math.max(
    MIN_POSICOES_COMPUTAVEIS - totalSelecionadas,
    0,
  );

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

  async function handleClearFilters() {
    setDraft("");
    await onClearFilters();
  }

  const filterPanelClassName = "order-last sm:basis-full sm:shrink-0";
  const filterTriggerClassName =
    "w-full [&>button]:w-full [&>button]:justify-center [&>span]:w-full sm:w-auto sm:[&>button]:w-auto sm:[&>span]:w-auto";

  return (
    <div className="grid gap-5">
      <div className="grid min-w-0 gap-4 sm:flex sm:flex-wrap sm:items-start sm:gap-2">
        <FeedSearch
          className="w-full sm:min-w-0 sm:flex-1"
          disabled={status === "loading"}
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
              value={ordenacao}
              onChange={onChangeOrdenacao}
            />

            {temas.length > 0 && (
              <FeedTemaControl
                activeTema={tema}
                onSelect={onChangeTema}
                panelClassName={filterPanelClassName}
                spanToolbar
                temas={temas}
                triggerClassName={filterTriggerClassName}
              />
            )}

            <Button
              className="h-11 min-w-0 sm:hidden"
              disabled={status === "loading"}
              onClick={handleClearFilters}
              variant="secondary"
            >
              Limpar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-8">
        <aside className="grid min-w-0 gap-5 rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <div className="grid gap-1">
            <h2 className="text-base font-[680] text-ink">Sua seleção</h2>
            <p className="text-sm leading-normal text-muted" role="status">
              {canAdvance
                ? `Selecionadas: ${totalSelecionadas} de até ${MAX_POSICOES}`
                : `Escolha pelo menos ${MIN_POSICOES_COMPUTAVEIS} proposições para continuar. Faltam ${faltamSelecionadas}.`}
            </p>
          </div>

          {atLimit ? (
            <InlineMessage
              body={`Você atingiu o limite de ${MAX_POSICOES} proposições. Desmarque uma para adicionar outra.`}
              title="Limite atingido"
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
            onClearFilters={onClearFilters}
            onLoadMore={onLoadMore}
            onToggle={onToggle}
            selectedIds={selectedIds}
            status={status}
            total={total}
          />
        </div>
      </div>
    </div>
  );
}

function SelecaoResumo({
  selected,
  onRemove,
}: {
  selected: ProposicaoCard[];
  onRemove: (proposicao: ProposicaoCard) => void;
}) {
  if (selected.length === 0) {
    return (
      <p className="rounded-md border border-border bg-white px-4 py-3 text-sm leading-normal text-muted">
        As proposições escolhidas aparecem aqui para revisão antes de declarar
        suas posições.
      </p>
    );
  }

  return (
    <ul className="-mr-1 grid max-h-96 overflow-x-hidden overflow-y-auto pr-1 lg:max-h-[min(55vh,32rem)] lg:divide-y lg:divide-border">
      {selected.map((card) => {
        const identificador = toIdentificadorLegislativo(card);
        const label = identificador ?? "Sem identificador";
        const textoResumo = toTextoResumo(card);

        return (
          <li
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border py-3 last:border-b-0 lg:border-b-0"
            key={card.externalIdProposicao}
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-[650] tracking-[-0.01em] text-ink">
                {label}
              </p>
              {textoResumo ? (
                <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted">
                  {textoResumo}
                </p>
              ) : null}
            </div>
            <button
              aria-label={`Remover ${label} da seleção`}
              className="shrink-0 text-sm font-[650] text-muted underline decoration-border underline-offset-2 transition-colors duration-[140ms] ease-standard hover:text-ink hover:decoration-current"
              onClick={() => onRemove(card)}
              type="button"
            >
              Remover
            </button>
          </li>
        );
      })}
    </ul>
  );
}
