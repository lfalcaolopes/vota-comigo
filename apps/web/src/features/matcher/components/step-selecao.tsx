"use client";

import { MAX_POSICOES } from "@vota-comigo/shared-types";
import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { useState } from "react";

import type { FeedDisplay, FeedStatus } from "@/shared/proposicao";
import { Button, InlineMessage } from "@/shared/ui";

import { SelecaoList } from "./selecao-list";
import { SelecaoSearch } from "./selecao-search";

type StepSelecaoProps = {
  items: ProposicaoCard[];
  total: number;
  status: FeedStatus;
  display: FeedDisplay;
  canLoadMore: boolean;
  query: string;
  selected: ProposicaoCard[];
  totalSelecionadas: number;
  onToggle: (proposicao: ProposicaoCard) => void;
  onSubmitSearch: (raw: string) => Promise<void>;
  onClearSearch: () => void;
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
  selected,
  totalSelecionadas,
  onToggle,
  onSubmitSearch,
  onClearSearch,
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

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (draft.trim().length === 0) {
      handleClear();
      return;
    }
    onSubmitSearch(draft);
  }

  return (
    <div className="grid gap-5">
      <SelecaoSearch
        disabled={status === "loading"}
        draft={draft}
        onChange={setDraft}
        onClear={handleClear}
        onSubmit={handleSearchSubmit}
        query={query}
      />

      <p className="text-sm leading-normal text-muted">
        Selecionadas: {totalSelecionadas} de até {MAX_POSICOES}
      </p>

      {atLimit ? (
        <InlineMessage
          body={`Você atingiu o limite de ${MAX_POSICOES} proposições. Desmarque uma para adicionar outra.`}
          title="Limite atingido"
        />
      ) : null}

      <SelecaoList
        atLimit={atLimit}
        canLoadMore={canLoadMore}
        display={display}
        items={items}
        onClearSearch={handleClear}
        onLoadMore={onLoadMore}
        onToggle={onToggle}
        selectedIds={selectedIds}
        status={status}
        total={total}
      />

      <div className="flex flex-wrap gap-3">
        <Button onClick={onBack} variant="secondary">
          Voltar
        </Button>
        <Button
          disabled={totalSelecionadas === 0}
          onClick={onAdvance}
          variant="primary"
        >
          Declarar posições
        </Button>
      </div>
    </div>
  );
}
