"use client";

import type { FeedOrdenacao, ProposicaoCard } from "@vota-comigo/shared-types";
import { useReducer } from "react";

import { feed as fetchFeed } from "./queries";

import {
  feedDisplay,
  feedReducer,
  hasMore,
  initFeedState,
  nextOffset,
  type FeedDisplay,
  type FeedStatus,
  type FeedState,
} from "./feed-state";

const PAGE_SIZE = 20;

export type UseFeedState = {
  items: ProposicaoCard[];
  total: number;
  status: FeedStatus;
  query: string;
  ordenacao: FeedOrdenacao;
  tema: FeedState["tema"];
  display: FeedDisplay;
  canLoadMore: boolean;
  submitSearch: (raw: string) => Promise<void>;
  clearSearch: () => Promise<void>;
  loadMore: () => Promise<void>;
  changeOrdenacao: (value: FeedOrdenacao) => Promise<void>;
  changeTema: (tema: number) => Promise<void>;
  clearTema: () => Promise<void>;
  clearFilters: () => Promise<void>;
};

export function useFeedState(
  initialItems: ProposicaoCard[],
  initialTotal: number,
  initialOrdenacao: FeedOrdenacao = "mais-votadas",
  initialTema: number | null = null,
  initialQuery = "",
): UseFeedState {
  const [state, dispatch] = useReducer(
    feedReducer,
    initFeedState(
      initialItems,
      initialTotal,
      initialOrdenacao,
      initialTema,
      initialQuery,
    ),
  );

  async function submitSearch(raw: string) {
    const term = raw.trim();
    if (term.length === 0) {
      await clearSearch();
      return;
    }
    if (state.status === "loading") return;

    dispatch({ type: "changeQuery", query: term });

    try {
      const page = await fetchFeed(
        PAGE_SIZE,
        0,
        state.ordenacao,
        state.tema ?? undefined,
        term,
      );
      dispatch({ type: "feedSuccess", items: page.items, total: page.total });
    } catch (error) {
      console.error("feed search failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function clearSearch() {
    if (state.status === "loading") return;

    dispatch({ type: "clearSearch" });

    try {
      const page = await fetchFeed(
        PAGE_SIZE,
        0,
        state.ordenacao,
        state.tema ?? undefined,
        undefined,
      );
      dispatch({ type: "feedSuccess", items: page.items, total: page.total });
    } catch (error) {
      console.error("feed clear search failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function loadMore() {
    if (state.status === "loading") return;

    dispatch({ type: "loadMoreStart" });

    try {
      const offset = nextOffset(state);
      const page = await fetchFeed(
        PAGE_SIZE,
        offset,
        state.ordenacao,
        state.tema ?? undefined,
        state.query || undefined,
      );
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
      const page = await fetchFeed(
        PAGE_SIZE,
        0,
        value,
        state.tema ?? undefined,
        state.query || undefined,
      );
      dispatch({ type: "feedSuccess", items: page.items, total: page.total });
    } catch (error) {
      console.error("feed change ordenacao failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function changeTema(tema: number) {
    if (state.status === "loading") return;

    dispatch({ type: "changeTema", tema });

    try {
      const page = await fetchFeed(
        PAGE_SIZE,
        0,
        state.ordenacao,
        tema,
        state.query || undefined,
      );
      dispatch({ type: "feedSuccess", items: page.items, total: page.total });
    } catch (error) {
      console.error("feed change tema failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function clearTema() {
    if (state.status === "loading") return;

    dispatch({ type: "clearTema" });

    try {
      const page = await fetchFeed(
        PAGE_SIZE,
        0,
        state.ordenacao,
        undefined,
        state.query || undefined,
      );
      dispatch({ type: "feedSuccess", items: page.items, total: page.total });
    } catch (error) {
      console.error("feed clear tema failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function clearFilters() {
    if (state.status === "loading") return;

    dispatch({ type: "clearFilters" });

    try {
      const page = await fetchFeed(
        PAGE_SIZE,
        0,
        state.ordenacao,
        undefined,
        undefined,
      );
      dispatch({ type: "feedSuccess", items: page.items, total: page.total });
    } catch (error) {
      console.error("feed clear filters failed", error);
      dispatch({ type: "loadError" });
    }
  }

  return {
    items: state.feed.items,
    total: state.feed.total,
    status: state.status,
    query: state.query,
    ordenacao: state.ordenacao,
    tema: state.tema,
    display: feedDisplay(state),
    canLoadMore: hasMore(state),
    submitSearch,
    clearSearch,
    loadMore,
    changeOrdenacao,
    changeTema,
    clearTema,
    clearFilters,
  };
}
