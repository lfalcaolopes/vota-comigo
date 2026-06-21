import type { FeedOrdenacao, ProposicaoCard } from "@vota-comigo/shared-types";

export type { FeedOrdenacao };

export type FeedStatus = "idle" | "loading" | "error";

type Page = {
  items: ProposicaoCard[];
  total: number;
};

export type FeedState = {
  query: string;
  ordenacao: FeedOrdenacao;
  tema: number | null;
  feed: Page;
  status: FeedStatus;
};

export type FeedAction =
  | { type: "changeQuery"; query: string }
  | { type: "clearSearch" }
  | { type: "changeOrdenacao"; ordenacao: FeedOrdenacao }
  | { type: "changeTema"; tema: number }
  | { type: "clearTema" }
  | { type: "clearFilters" }
  | { type: "loadMoreStart" }
  | { type: "loadMoreSuccess"; items: ProposicaoCard[]; total: number }
  | { type: "feedSuccess"; items: ProposicaoCard[]; total: number }
  | { type: "loadError" };

const emptyPage: Page = { items: [], total: 0 };

export function initFeedState(
  items: ProposicaoCard[],
  total: number,
  ordenacao: FeedOrdenacao = "mais-votadas",
  tema: number | null = null,
  query = "",
): FeedState {
  return {
    query: query.trim(),
    ordenacao,
    tema,
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
    case "changeOrdenacao":
      return {
        ...state,
        ordenacao: action.ordenacao,
        feed: emptyPage,
        status: "loading",
      };
    case "changeTema":
      return {
        ...state,
        tema: action.tema,
        feed: emptyPage,
        status: "loading",
      };
    case "clearTema":
      return {
        ...state,
        tema: null,
        feed: emptyPage,
        status: "loading",
      };
    case "clearFilters":
      return {
        ...state,
        query: "",
        tema: null,
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
  if (state.query !== "" || state.tema !== null) return "empty-filtered";
  return "empty-default";
}

export function nextOffset(state: FeedState): number {
  return state.feed.items.length;
}

export function hasMore(state: FeedState): boolean {
  return state.feed.items.length < state.feed.total;
}
