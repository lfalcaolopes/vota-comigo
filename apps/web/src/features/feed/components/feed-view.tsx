"use client";

import type {
  FeedOrdenacao,
  ProposicaoCard,
  TemaDisponivel,
} from "@vota-comigo/shared-types";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import {
  buildFeedHref,
  buildFeedSearchParams,
  FeedOrdenacaoControl,
  FeedSearch,
  FeedTemaControl,
  useFeedState,
} from "@/shared/proposicao";

import { FeedList } from "./feed-list";

type FeedViewProps = {
  initialItems: ProposicaoCard[];
  initialTotal: number;
  initialOrdenacao?: FeedOrdenacao;
  initialQuery?: string | null;
  initialTema?: number | null;
  temas?: readonly TemaDisponivel[];
};

export function FeedView({
  initialItems,
  initialTotal,
  initialOrdenacao = "mais-votadas",
  initialQuery = null,
  initialTema = null,
  temas = [],
}: FeedViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  const {
    items,
    total,
    status,
    query,
    ordenacao,
    tema,
    display,
    canLoadMore,
    submitSearch,
    clearSearch,
    loadMore,
    changeOrdenacao,
    changeTema,
    clearTema,
    clearFilters,
  } = useFeedState(
    initialItems,
    initialTotal,
    initialOrdenacao,
    initialTema,
    initialQuery ?? "",
  );

  const [draft, setDraft] = useState(initialQuery ?? "");
  const activeQuery = query || null;
  const itemSearchParams = buildFeedSearchParams({
    ordenacao,
    query: activeQuery,
    tema,
  }).toString();

  async function handleClear() {
    setDraft("");
    router.replace(buildFeedHref(pathname, { ordenacao, query: null, tema }));
    await clearSearch();
  }

  async function handleSearch() {
    const term = draft.trim();
    if (term.length === 0) {
      await handleClear();
      return;
    }

    router.replace(buildFeedHref(pathname, { ordenacao, query: term, tema }));
    await submitSearch(term);
  }

  async function handleOrdenacao(value: FeedOrdenacao) {
    router.replace(
      buildFeedHref(pathname, { ordenacao: value, query: activeQuery, tema }),
    );
    await changeOrdenacao(value);
  }

  async function handleTema(cod: number) {
    const next = tema === cod ? null : cod;
    router.replace(
      buildFeedHref(pathname, { ordenacao, query: activeQuery, tema: next }),
    );
    if (next === null) {
      await clearTema();
    } else {
      await changeTema(next);
    }
  }

  async function handleClearTema() {
    router.replace(
      buildFeedHref(pathname, { ordenacao, query: activeQuery, tema: null }),
    );
    await clearTema();
  }

  async function handleClearFilters() {
    router.replace(
      buildFeedHref(pathname, { ordenacao, query: null, tema: null }),
    );
    await clearFilters();
  }

  return (
    <div className="grid min-w-0 gap-7">
      <div className="grid min-w-0 gap-4 sm:grid-cols-[auto_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-start">
        <FeedSearch
          className="w-full sm:col-span-2 lg:col-span-1"
          disabled={status === "loading"}
          isSearching={query !== ""}
          onChange={setDraft}
          onClear={handleClear}
          onSubmit={handleSearch}
          query={query}
          value={draft}
        />

        <FeedOrdenacaoControl value={ordenacao} onChange={handleOrdenacao} />

        {temas.length > 0 && (
          <FeedTemaControl
            activeTema={tema}
            onClear={handleClearTema}
            onSelect={handleTema}
            spanToolbar
            temas={temas}
          />
        )}
      </div>

      <FeedList
        canLoadMore={canLoadMore}
        display={display}
        items={items}
        itemSearchParams={itemSearchParams}
        onClearFilters={handleClearFilters}
        onLoadMore={loadMore}
        status={status}
        total={total}
      />
    </div>
  );
}
