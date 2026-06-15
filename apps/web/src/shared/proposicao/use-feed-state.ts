"use client";

import type { FeedOrdenacao, ProposicaoCard } from "@vota-comigo/shared-types";
import { useReducer } from "react";

import { feed as fetchFeed, search } from "./queries";

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
} from "./feed-state";

const PAGE_SIZE = 20;

export type UseFeedState = {
  items: ProposicaoCard[];
  total: number;
  status: FeedStatus;
  mode: FeedMode;
  query: string;
  ordenacao: FeedOrdenacao;
  display: FeedDisplay;
  canLoadMore: boolean;
  submitSearch: (raw: string) => Promise<void>;
  clearSearch: () => void;
  loadMore: () => Promise<void>;
  changeOrdenacao: (value: FeedOrdenacao) => Promise<void>;
};

export function useFeedState(
  initialItems: ProposicaoCard[],
  initialTotal: number,
  initialOrdenacao: FeedOrdenacao = 'mais-votadas',
): UseFeedState {
  const [state, dispatch] = useReducer(
    feedReducer,
    initFeedState(initialItems, initialTotal, initialOrdenacao),
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
          : await fetchFeed(PAGE_SIZE, offset, state.ordenacao);
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

  async function changeOrdenacao(value: FeedOrdenacao) {
    if (state.status === "loading") return;

    dispatch({ type: "changeOrdenacao", ordenacao: value });

    try {
      const page = await fetchFeed(PAGE_SIZE, 0, value);
      dispatch({
        type: "loadMoreSuccess",
        items: page.items,
        total: page.total,
      });
    } catch (error) {
      console.error("feed change ordenacao failed", error);
      dispatch({ type: "loadError" });
    }
  }

  const activePage = activeFeed(state);

  return {
    items: activePage.items,
    total: activePage.total,
    status: state.status,
    mode: state.mode,
    query: state.query,
    ordenacao: state.ordenacao,
    display: feedDisplay(state),
    canLoadMore: hasMore(state),
    submitSearch,
    clearSearch,
    loadMore,
    changeOrdenacao,
  };
}
