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
  useFeedState,
} from "@/shared/proposicao";

import { FeedList } from "./feed-list";
import { FeedOrdenacao as FeedOrdenacaoControl } from "./feed-ordenacao";
import { FeedSearch } from "./feed-search";
import { FeedTemaControl } from "./feed-tema";

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
    mode,
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
    clearFilters,
  } = useFeedState(
    initialItems,
    initialTotal,
    initialOrdenacao,
    initialTema,
    initialQuery ?? "",
  );

  const [draft, setDraft] = useState(initialQuery ?? "");
  const activeQuery = mode === "search" ? query : null;
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
      buildFeedHref(pathname, { ordenacao: value, query: null, tema }),
    );
    await changeOrdenacao(value);
  }

  async function handleTema(cod: number) {
    const next = tema === cod ? null : cod;
    router.replace(
      buildFeedHref(pathname, { ordenacao, query: null, tema: next }),
    );
    if (next === null) {
      await clearFilters();
    } else {
      await changeTema(next);
    }
  }

  async function handleClearFilters() {
    router.replace(
      buildFeedHref(pathname, { ordenacao, query: null, tema: null }),
    );
    await clearFilters();
  }

  return (
    <div className="grid min-w-0 gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FeedSearch
          disabled={status === "loading"}
          isSearching={mode === "search"}
          onChange={setDraft}
          onClear={handleClear}
          onSubmit={handleSearch}
          query={query}
          value={draft}
        />
        <FeedOrdenacaoControl value={ordenacao} onChange={handleOrdenacao} />
      </div>

      {temas.length > 0 && (
        <FeedTemaControl
          activeTema={tema}
          onSelect={handleTema}
          temas={temas}
        />
      )}

      <FeedList
        canLoadMore={canLoadMore}
        display={display}
        items={items}
        itemSearchParams={itemSearchParams}
        onClearFilters={handleClearFilters}
        onClearSearch={handleClear}
        onLoadMore={loadMore}
        status={status}
        total={total}
      />
    </div>
  );
}
