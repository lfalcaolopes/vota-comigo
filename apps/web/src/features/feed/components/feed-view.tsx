"use client";

import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { useState } from "react";

import { useFeedState } from "@/shared/proposicao";

import { FeedList } from "./feed-list";
import { FeedSearch } from "./feed-search";

type FeedViewProps = {
  initialItems: ProposicaoCard[];
  initialTotal: number;
};

export function FeedView({ initialItems, initialTotal }: FeedViewProps) {
  const {
    items,
    total,
    status,
    mode,
    query,
    display,
    canLoadMore,
    submitSearch,
    clearSearch,
    loadMore,
  } = useFeedState(initialItems, initialTotal);

  const [draft, setDraft] = useState("");

  function handleClear() {
    setDraft("");
    clearSearch();
  }

  return (
    <div className="grid min-w-0 gap-8">
      <FeedSearch
        disabled={status === "loading"}
        isSearching={mode === "search"}
        onChange={setDraft}
        onClear={handleClear}
        onSubmit={() => submitSearch(draft)}
        query={query}
        value={draft}
      />

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
