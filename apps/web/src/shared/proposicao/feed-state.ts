import type { FeedOrdenacao, ProposicaoCard } from "@vota-comigo/shared-types";

import { FILTROS_PADRAO, type ProposicaoFeedFiltros } from "./feed-filtros";

export type { FeedOrdenacao };

export type FeedStatus = "idle" | "loading" | "error";

type Page = {
  items: ProposicaoCard[];
  total: number;
};

export type FeedState = {
  query: string;
  filtros: ProposicaoFeedFiltros;
  feed: Page;
  status: FeedStatus;
};

export type FeedAction =
  | { type: "changeQuery"; query: string }
  | { type: "clearSearch" }
  | { type: "applyFiltros"; filtros: ProposicaoFeedFiltros }
  | { type: "clearTudo" }
  | { type: "applySuggestion"; query: string }
  | { type: "loadMoreStart" }
  | { type: "loadMoreSuccess"; items: ProposicaoCard[]; total: number }
  | { type: "feedSuccess"; items: ProposicaoCard[]; total: number }
  | { type: "loadError" };

const emptyPage: Page = { items: [], total: 0 };

type InitFeedState = {
  items: ProposicaoCard[];
  total: number;
  query?: string;
  filtros?: ProposicaoFeedFiltros;
};

export function initFeedState({
  items,
  total,
  query = "",
  filtros = FILTROS_PADRAO,
}: InitFeedState): FeedState {
  return {
    query: query.trim(),
    filtros,
    feed: { items, total },
    status: "idle",
  };
}

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "changeQuery":
      return {
        ...state,
        query: action.query,
        feed: emptyPage,
        status: "loading",
      };
    case "clearSearch":
      return {
        ...state,
        query: "",
        feed: emptyPage,
        status: "loading",
      };
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
    case "applySuggestion":
      return {
        ...state,
        query: action.query,
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

export type FeedDisplay =
  | "results"
  | "loading"
  | "empty-default"
  | "empty-filtered"
  | "error";

export function feedDisplay(state: FeedState): FeedDisplay {
  if (state.feed.items.length > 0) return "results";
  if (state.status === "error") return "error";
  if (state.status === "loading") return "loading";
  // A ordenação não restringe o conjunto, então só busca e tema explicam vazio.
  if (state.query !== "" || state.filtros.tema !== null)
    return "empty-filtered";
  return "empty-default";
}

export function nextOffset(state: FeedState): number {
  return state.feed.items.length;
}

export function hasMore(state: FeedState): boolean {
  return state.feed.items.length < state.feed.total;
}
