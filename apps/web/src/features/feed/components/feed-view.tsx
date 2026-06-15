"use client";

import type {
  FeedOrdenacao,
  ProposicaoCard,
  TemaDisponivel,
} from "@vota-comigo/shared-types";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useFeedState } from "@/shared/proposicao";

import { FeedList } from "./feed-list";
import { FeedOrdenacao as FeedOrdenacaoControl } from "./feed-ordenacao";
import { FeedSearch } from "./feed-search";
import { FeedTemaControl } from "./feed-tema";

type FeedViewProps = {
  initialItems: ProposicaoCard[];
  initialTotal: number;
  initialOrdenacao?: FeedOrdenacao;
  initialTema?: number | null;
  temas?: readonly TemaDisponivel[];
};

export function FeedView({
  initialItems,
  initialTotal,
  initialOrdenacao = "mais-votadas",
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
  } = useFeedState(initialItems, initialTotal, initialOrdenacao, initialTema);

  const [draft, setDraft] = useState("");

  function handleClear() {
    setDraft("");
    clearSearch();
  }

  async function handleOrdenacao(value: FeedOrdenacao) {
    const params = buildUrlParams(value, tema);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname);
    await changeOrdenacao(value);
  }

  async function handleTema(cod: number) {
    const next = tema === cod ? null : cod;
    const params = buildUrlParams(ordenacao, next);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname);
    if (next === null) {
      await clearFilters();
    } else {
      await changeTema(next);
    }
  }

  async function handleClearFilters() {
    const params = buildUrlParams(ordenacao, null);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname);
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
          onSubmit={() => submitSearch(draft)}
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
        onClearFilters={handleClearFilters}
        onClearSearch={handleClear}
        onLoadMore={loadMore}
        status={status}
        total={total}
      />
    </div>
  );
}

function buildUrlParams(
  ordenacao: FeedOrdenacao,
  tema: number | null,
): URLSearchParams {
  const params = new URLSearchParams();
  if (ordenacao !== "mais-votadas") params.set("ordenacao", ordenacao);
  if (tema !== null) params.set("tema", String(tema));
  return params;
}
