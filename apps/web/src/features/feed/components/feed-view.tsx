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
import { Button } from "@/shared/ui";

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
    setDraft("");
    router.replace(
      buildFeedHref(pathname, { ordenacao, query: null, tema: null }),
    );
    await clearFilters();
  }

  const filterPanelClassName = "order-last sm:basis-full sm:shrink-0";
  const filterTriggerClassName =
    "w-full [&>button]:w-full [&>button]:justify-center [&>span]:w-full sm:w-auto sm:[&>button]:w-auto sm:[&>span]:w-auto";

  return (
    <div className="grid min-w-0 gap-7">
      <div className="grid min-w-0 gap-4 sm:flex sm:flex-wrap sm:items-start sm:gap-2">
        <FeedSearch
          className="w-full sm:min-w-0 sm:flex-1"
          disabled={status === "loading"}
          isSearching={query !== ""}
          onChange={setDraft}
          onClear={handleClear}
          onSubmit={handleSearch}
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
              onChange={handleOrdenacao}
            />

            {temas.length > 0 && (
              <FeedTemaControl
                activeTema={tema}
                onClear={handleClearTema}
                onSelect={handleTema}
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
