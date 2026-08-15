"use client";

import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { useReducer, useRef } from "react";

import { FILTROS_PADRAO, type ProposicaoFeedFiltros } from "./feed-filtros";
import { feed as fetchFeed } from "./queries";

import {
  feedDisplay,
  feedReducer,
  hasMore,
  initFeedState,
  nextOffset,
  type FeedDisplay,
  type FeedStatus,
} from "./feed-state";

const PAGE_SIZE = 20;

type Recorte = {
  query: string;
  filtros: ProposicaoFeedFiltros;
};

export type UseFeedState = {
  items: ProposicaoCard[];
  total: number;
  status: FeedStatus;
  query: string;
  filtros: ProposicaoFeedFiltros;
  display: FeedDisplay;
  canLoadMore: boolean;
  submitSearch: (raw: string) => Promise<void>;
  clearSearch: () => Promise<void>;
  applyFiltros: (filtros: ProposicaoFeedFiltros) => Promise<void>;
  clearTudo: () => Promise<void>;
  loadMore: () => Promise<void>;
};

type UseFeedStateInput = {
  items: ProposicaoCard[];
  total: number;
  query?: string;
  filtros?: ProposicaoFeedFiltros;
};

export function useFeedState({
  items,
  total,
  query = "",
  filtros = FILTROS_PADRAO,
}: UseFeedStateInput): UseFeedState {
  const [state, dispatch] = useReducer(
    feedReducer,
    { items, total, query, filtros },
    initFeedState,
  );
  // Só a resposta do último recorte pedido pode escrever no estado: busca e
  // filtros disparam pelo mesmo caminho e podem voltar fora de ordem.
  const requestIdRef = useRef(0);

  async function reload(recorte: Recorte) {
    const requestId = ++requestIdRef.current;

    try {
      const page = await fetchFeed(
        PAGE_SIZE,
        0,
        recorte.filtros.ordenacao,
        recorte.filtros.tema ?? undefined,
        recorte.query || undefined,
      );
      if (requestIdRef.current !== requestId) return;
      dispatch({ type: "feedSuccess", items: page.items, total: page.total });
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      console.error("feed reload failed", error);
      dispatch({ type: "loadError" });
    }
  }

  async function submitSearch(raw: string) {
    const term = raw.trim();
    if (term.length === 0) {
      await clearSearch();
      return;
    }

    dispatch({ type: "changeQuery", query: term });
    await reload({ query: term, filtros: state.filtros });
  }

  async function clearSearch() {
    dispatch({ type: "clearSearch" });
    await reload({ query: "", filtros: state.filtros });
  }

  async function applyFiltros(filtros: ProposicaoFeedFiltros) {
    dispatch({ type: "applyFiltros", filtros });
    await reload({ query: state.query, filtros });
  }

  async function clearTudo() {
    dispatch({ type: "clearTudo" });
    await reload({ query: "", filtros: FILTROS_PADRAO });
  }

  async function loadMore() {
    if (state.status === "loading") return;

    const requestId = ++requestIdRef.current;
    dispatch({ type: "loadMoreStart" });

    try {
      const page = await fetchFeed(
        PAGE_SIZE,
        nextOffset(state),
        state.filtros.ordenacao,
        state.filtros.tema ?? undefined,
        state.query || undefined,
      );
      if (requestIdRef.current !== requestId) return;
      dispatch({
        type: "loadMoreSuccess",
        items: page.items,
        total: page.total,
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      console.error("feed load more failed", error);
      dispatch({ type: "loadError" });
    }
  }

  return {
    items: state.feed.items,
    total: state.feed.total,
    status: state.status,
    query: state.query,
    filtros: state.filtros,
    display: feedDisplay(state),
    canLoadMore: hasMore(state),
    submitSearch,
    clearSearch,
    applyFiltros,
    clearTudo,
    loadMore,
  };
}
