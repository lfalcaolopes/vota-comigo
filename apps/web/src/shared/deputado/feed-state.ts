import type { DeputadoCard } from "@vota-comigo/shared-types";

export type DeputadoFeedStatus = "idle" | "loading" | "error";

type Page = {
  items: DeputadoCard[];
  total: number;
};

export type DeputadoFeedState = {
  query: string;
  emAtividade: boolean;
  uf: string | null;
  partido: string | null;
  feed: Page;
  status: DeputadoFeedStatus;
};

export type DeputadoFeedAction =
  | { type: "changeQuery"; query: string }
  | { type: "clearSearch" }
  | { type: "toggleEmAtividade" }
  | { type: "changeUf"; uf: string }
  | { type: "clearUf" }
  | { type: "changePartido"; partido: string }
  | { type: "clearPartido" }
  | { type: "clearFilters" }
  | { type: "loadMoreStart" }
  | { type: "loadMoreSuccess"; items: DeputadoCard[]; total: number }
  | { type: "feedSuccess"; items: DeputadoCard[]; total: number }
  | { type: "loadError" };

const emptyPage: Page = { items: [], total: 0 };

export function initDeputadoFeedState(
  items: DeputadoCard[],
  total: number,
  query = "",
  emAtividade = false,
  uf: string | null = null,
  partido: string | null = null,
): DeputadoFeedState {
  return {
    query: query.trim(),
    emAtividade,
    uf,
    partido,
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
    case "toggleEmAtividade":
      return {
        ...state,
        emAtividade: !state.emAtividade,
        feed: emptyPage,
        status: "loading",
      };
    case "changeUf":
      return { ...state, uf: action.uf, feed: emptyPage, status: "loading" };
    case "clearUf":
      return { ...state, uf: null, feed: emptyPage, status: "loading" };
    case "changePartido":
      return {
        ...state,
        partido: action.partido,
        feed: emptyPage,
        status: "loading",
      };
    case "clearPartido":
      return { ...state, partido: null, feed: emptyPage, status: "loading" };
    case "clearFilters":
      return {
        ...state,
        query: "",
        emAtividade: false,
        uf: null,
        partido: null,
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
  if (
    state.query !== "" ||
    state.emAtividade ||
    state.uf !== null ||
    state.partido !== null
  ) {
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
