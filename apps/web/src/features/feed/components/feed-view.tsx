"use client";

import type { FeedOrdenacao, ProposicaoCard } from "@vota-comigo/shared-types";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useFeedState } from "@/shared/proposicao";

import { FeedList } from "./feed-list";
import { FeedOrdenacao as FeedOrdenacaoControl } from "./feed-ordenacao";
import { FeedSearch } from "./feed-search";

type FeedViewProps = {
  initialItems: ProposicaoCard[];
  initialTotal: number;
  initialOrdenacao?: FeedOrdenacao;
};

export function FeedView({
  initialItems,
  initialTotal,
  initialOrdenacao = "mais-votadas",
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
    display,
    canLoadMore,
    submitSearch,
    clearSearch,
    loadMore,
    changeOrdenacao,
  } = useFeedState(initialItems, initialTotal, initialOrdenacao);

  const [draft, setDraft] = useState("");

  function handleClear() {
    setDraft("");
    clearSearch();
  }

  async function handleOrdenacao(value: FeedOrdenacao) {
    const params = new URLSearchParams();
    if (value !== "mais-votadas") params.set("ordenacao", value);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname);
    await changeOrdenacao(value);
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

      <FeedList
        canLoadMore={canLoadMore}
        display={display}
        items={items}
        onClearSearch={handleClear}
        onLoadMore={loadMore}
        status={status}
        total={total}
      />
    </div>
  );
}
