"use client";

import type { DeputadoCard } from "@vota-comigo/shared-types";
import { useReducer } from "react";

import { feed as fetchFeed } from "./queries";
import {
  deputadoFeedDisplay,
  deputadoFeedReducer,
  deputadoHasMore,
  deputadoNextOffset,
  initDeputadoFeedState,
  type DeputadoFeedDisplay,
  type DeputadoFeedState,
  type DeputadoFeedStatus,
} from "./feed-state";

const PAGE_SIZE = 20;

export type UseDeputadoFeedState = {
  items: DeputadoCard[];
  total: number;
  status: DeputadoFeedStatus;
  query: string;
  emAtividade: boolean;
  uf: DeputadoFeedState["uf"];
  display: DeputadoFeedDisplay;
  canLoadMore: boolean;
  submitSearch: (raw: string) => Promise<void>;
  clearSearch: () => Promise<void>;
  toggleEmAtividade: () => Promise<void>;
  changeUf: (uf: string) => Promise<void>;
  clearUf: () => Promise<void>;
  clearFilters: () => Promise<void>;
  loadMore: () => Promise<void>;
};

export function useDeputadoFeedState(
  initialItems: DeputadoCard[],
  initialTotal: number,
  initialQuery = "",
  initialEmAtividade = false,
  initialUf: string | null = null,
): UseDeputadoFeedState {
  const [state, dispatch] = useReducer(
    deputadoFeedReducer,
    initDeputadoFeedState(
      initialItems,
      initialTotal,
      initialQuery,
      initialEmAtividade,
      initialUf,
    ),
  );

  async function reload(next: {
    query?: string;
    emAtividade?: boolean;
    uf?: string | null;
  }) {
    const query = next.query ?? state.query;
    const emAtividade = next.emAtividade ?? state.emAtividade;
    const uf = next.uf === null ? null : next.uf ?? state.uf;

    const page = await fetchFeed(
      PAGE_SIZE,
      0,
      query || undefined,
      emAtividade || undefined,
      uf ?? undefined,
    );
    dispatch({ type: "feedSuccess", items: page.items, total: page.total });
  }

  async function submitSearch(raw: string) {
    const term = raw.trim();
    if (term.length === 0) {
      await clearSearch();
      return;
    }
    if (state.status === "loading") return;

    dispatch({ type: "changeQuery", query: term });

    try {
      await reload({ query: term });
    } catch (error) {
      console.error("deputado feed search failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function clearSearch() {
    if (state.status === "loading") return;

    dispatch({ type: "clearSearch" });

    try {
      await reload({ query: "" });
    } catch (error) {
      console.error("deputado feed clear search failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function toggleEmAtividade() {
    if (state.status === "loading") return;

    const next = !state.emAtividade;
    dispatch({ type: "toggleEmAtividade" });

    try {
      await reload({ emAtividade: next });
    } catch (error) {
      console.error("deputado feed activity filter failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function changeUf(uf: string) {
    if (state.status === "loading") return;

    dispatch({ type: "changeUf", uf });

    try {
      await reload({ uf });
    } catch (error) {
      console.error("deputado feed UF filter failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function clearUf() {
    if (state.status === "loading") return;

    dispatch({ type: "clearUf" });

    try {
      await reload({ uf: null });
    } catch (error) {
      console.error("deputado feed clear UF failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function clearFilters() {
    if (state.status === "loading") return;

    dispatch({ type: "clearFilters" });

    try {
      const page = await fetchFeed(PAGE_SIZE, 0);
      dispatch({ type: "feedSuccess", items: page.items, total: page.total });
    } catch (error) {
      console.error("deputado feed clear filters failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function loadMore() {
    if (state.status === "loading") return;

    dispatch({ type: "loadMoreStart" });

    try {
      const page = await fetchFeed(
        PAGE_SIZE,
        deputadoNextOffset(state),
        state.query || undefined,
        state.emAtividade || undefined,
        state.uf ?? undefined,
      );
      dispatch({
        type: "loadMoreSuccess",
        items: page.items,
        total: page.total,
      });
    } catch (error) {
      console.error("deputado feed load more failed", error);
      dispatch({ type: "loadError" });
    }
  }

  return {
    items: state.feed.items,
    total: state.feed.total,
    status: state.status,
    query: state.query,
    emAtividade: state.emAtividade,
    uf: state.uf,
    display: deputadoFeedDisplay(state),
    canLoadMore: deputadoHasMore(state),
    submitSearch,
    clearSearch,
    toggleEmAtividade,
    changeUf,
    clearUf,
    clearFilters,
    loadMore,
  };
}
