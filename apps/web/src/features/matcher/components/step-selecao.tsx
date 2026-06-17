"use client";

import { MAX_POSICOES } from "@vota-comigo/shared-types";
import type { FeedOrdenacao, ProposicaoCard, TemaDisponivel } from "@vota-comigo/shared-types";
import { useState } from "react";

import type { FeedDisplay, FeedStatus } from "@/shared/proposicao";
import {
  FeedOrdenacaoControl,
  FeedSearch,
  FeedTemaControl,
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

  return (
    <div className="grid gap-5">
      <div className="grid min-w-0 gap-4 sm:grid-cols-[auto_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-start">
        <FeedSearch
          className="w-full sm:col-span-2 lg:col-span-1"
          disabled={status === "loading"}
          isSearching={query !== ""}
          onChange={setDraft}
          onClear={handleClear}
          onSubmit={handleSearchSubmit}
          query={query}
          value={draft}
        />

        <FeedOrdenacaoControl value={ordenacao} onChange={onChangeOrdenacao} />

        {temas.length > 0 && (
          <FeedTemaControl
            activeTema={tema}
            onSelect={onChangeTema}
            spanToolbar
            temas={temas}
          />
        )}
      </div>

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
        onClearFilters={onClearFilters}
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
