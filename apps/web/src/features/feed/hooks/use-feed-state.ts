"use client";

import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { useReducer } from "react";

import { maisVotadas, search } from "@/shared/proposicao";

import {
  activeFeed,
  feedDisplay,
  feedReducer,
  hasMore,
  initFeedState,
  nextOffset,
  type FeedDisplay,
  type FeedMode,
  type FeedStatus,
} from "../lib/feed-state";

const PAGE_SIZE = 20;

export type UseFeedState = {
  items: ProposicaoCard[];
  total: number;
  status: FeedStatus;
  mode: FeedMode;
  query: string;
  display: FeedDisplay;
  canLoadMore: boolean;
  submitSearch: (raw: string) => Promise<void>;
  clearSearch: () => void;
  loadMore: () => Promise<void>;
};

export function useFeedState(
  initialItems: ProposicaoCard[],
  initialTotal: number,
): UseFeedState {
  const [state, dispatch] = useReducer(
    feedReducer,
    initFeedState(initialItems, initialTotal),
  );

  async function submitSearch(raw: string) {
    const term = raw.trim();
    if (term.length === 0) {
      dispatch({ type: "clearSearch" });
      return;
    }
    if (state.status === "loading") return;

    dispatch({ type: "searchStart", query: term });

    try {
      const page = await search(term, PAGE_SIZE, 0);
      dispatch({ type: "searchSuccess", items: page.items, total: page.total });
    } catch (error) {
      console.error("feed search failed", error);
      dispatch({ type: "loadError" });
    }
  }

  function clearSearch() {
    dispatch({ type: "clearSearch" });
  }

  async function loadMore() {
    if (state.status === "loading") return;

    dispatch({ type: "loadMoreStart" });

    try {
      const offset = nextOffset(state);
      const page =
        state.mode === "search"
          ? await search(state.query, PAGE_SIZE, offset)
          : await maisVotadas(PAGE_SIZE, offset);
      dispatch({
        type: "loadMoreSuccess",
        items: page.items,
        total: page.total,
      });
    } catch (error) {
      console.error("feed load more failed", error);
      dispatch({ type: "loadError" });
    }
  }

  const feed = activeFeed(state);

  return {
    items: feed.items,
    total: feed.total,
    status: state.status,
    mode: state.mode,
    query: state.query,
    display: feedDisplay(state),
    canLoadMore: hasMore(state),
    submitSearch,
    clearSearch,
    loadMore,
  };
}
