import type { DeputadoCard } from "@vota-comigo/shared-types";

import {
  contarFiltrosAtivos,
  FILTROS_PADRAO,
  type DeputadoFeedFiltros,
} from "./feed-filtros";

export type DeputadoFeedStatus = "idle" | "loading" | "error";

type Page = {
  items: DeputadoCard[];
  total: number;
};

export type DeputadoFeedState = {
  query: string;
  filtros: DeputadoFeedFiltros;
  feed: Page;
  status: DeputadoFeedStatus;
};

export type DeputadoFeedAction =
  | { type: "changeQuery"; query: string }
  | { type: "clearSearch" }
  | { type: "applyFiltros"; filtros: DeputadoFeedFiltros }
  | { type: "clearTudo" }
  | { type: "loadMoreStart" }
  | { type: "loadMoreSuccess"; items: DeputadoCard[]; total: number }
  | { type: "feedSuccess"; items: DeputadoCard[]; total: number }
  | { type: "loadError" };

type InitDeputadoFeedState = {
  items: DeputadoCard[];
  total: number;
  query?: string;
  filtros?: DeputadoFeedFiltros;
};

const emptyPage: Page = { items: [], total: 0 };

export function initDeputadoFeedState({
  items,
  total,
  query = "",
  filtros = FILTROS_PADRAO,
}: InitDeputadoFeedState): DeputadoFeedState {
  return {
    query: query.trim(),
    filtros,
    feed: { items, total },
    status: "idle",
  };
}

export function deputadoFeedReducer(
  state: DeputadoFeedState,
  action: DeputadoFeedAction,
): DeputadoFeedState {
  switch (action.type) {
    case "changeQuery":
      return {
        ...state,
        query: action.query,
        feed: emptyPage,
        status: "loading",
      };
    case "clearSearch":
      return { ...state, query: "", feed: emptyPage, status: "loading" };
    case "applyFiltros":
      return {
        ...state,
        filtros: action.filtros,
        feed: emptyPage,
        status: "loading",
      };
    case "clearTudo":
      return {
        ...state,
        query: "",
        filtros: FILTROS_PADRAO,
        feed: emptyPage,
        status: "loading",
      };
    case "loadMoreStart":
      return { ...state, status: "loading" };
    case "loadMoreSuccess":
      return {
        ...state,
        feed: {
          items: [...state.feed.items, ...action.items],
          total: action.total,
        },
        status: "idle",
      };
    case "feedSuccess":
      return {
        ...state,
        feed: { items: action.items, total: action.total },
        status: "idle",
      };
    case "loadError":
      return { ...state, status: "error" };
  }
}

export type DeputadoFeedDisplay =
  | "results"
  | "loading"
  | "empty-default"
  | "empty-filtered"
  | "error";

export function deputadoFeedDisplay(
  state: DeputadoFeedState,
): DeputadoFeedDisplay {
  if (state.feed.items.length > 0) return "results";
  if (state.status === "error") return "error";
  if (state.status === "loading") return "loading";
  if (state.query !== "" || contarFiltrosAtivos(state.filtros) > 0) {
    return "empty-filtered";
  }
  return "empty-default";
}

export function deputadoNextOffset(state: DeputadoFeedState): number {
  return state.feed.items.length;
}

export function deputadoHasMore(state: DeputadoFeedState): boolean {
  return state.feed.items.length < state.feed.total;
}
