"use client";

import type { DeputadoCard } from "@vota-comigo/shared-types";
import { useReducer, useRef } from "react";

import { FILTROS_PADRAO, type DeputadoFeedFiltros } from "./feed-filtros";
import { feed as fetchFeed } from "./queries";
import {
  deputadoFeedDisplay,
  deputadoFeedReducer,
  deputadoHasMore,
  deputadoNextOffset,
  initDeputadoFeedState,
  type DeputadoFeedDisplay,
  type DeputadoFeedStatus,
} from "./feed-state";

const PAGE_SIZE = 20;

type Recorte = {
  query: string;
  filtros: DeputadoFeedFiltros;
};

export type UseDeputadoFeedState = {
  items: DeputadoCard[];
  total: number;
  status: DeputadoFeedStatus;
  query: string;
  filtros: DeputadoFeedFiltros;
  display: DeputadoFeedDisplay;
  canLoadMore: boolean;
  submitSearch: (raw: string) => Promise<void>;
  clearSearch: () => Promise<void>;
  applyFiltros: (filtros: DeputadoFeedFiltros) => Promise<void>;
  clearTudo: () => Promise<void>;
  loadMore: () => Promise<void>;
};

type UseDeputadoFeedStateInput = {
  items: DeputadoCard[];
  total: number;
  query?: string;
  filtros?: DeputadoFeedFiltros;
};

export function useDeputadoFeedState(
  initial: UseDeputadoFeedStateInput,
): UseDeputadoFeedState {
  const [state, dispatch] = useReducer(
    deputadoFeedReducer,
    initial,
    initDeputadoFeedState,
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
        recorte.query || null,
        recorte.filtros,
      );
      if (requestIdRef.current !== requestId) return;
      dispatch({ type: "feedSuccess", items: page.items, total: page.total });
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      console.error("deputado feed reload failed", error);
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

  async function applyFiltros(filtros: DeputadoFeedFiltros) {
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
        deputadoNextOffset(state),
        state.query || null,
        state.filtros,
      );
      if (requestIdRef.current !== requestId) return;
      dispatch({
        type: "loadMoreSuccess",
        items: page.items,
        total: page.total,
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      console.error("deputado feed load more failed", error);
      dispatch({ type: "loadError" });
    }
  }

  return {
    items: state.feed.items,
    total: state.feed.total,
    status: state.status,
    query: state.query,
    filtros: state.filtros,
    display: deputadoFeedDisplay(state),
    canLoadMore: deputadoHasMore(state),
    submitSearch,
    clearSearch,
    applyFiltros,
    clearTudo,
    loadMore,
  };
}
