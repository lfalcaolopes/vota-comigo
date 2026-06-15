import type { FeedOrdenacao, ProposicaoCard } from "@vota-comigo/shared-types";

export type { FeedOrdenacao };

export type FeedMode = "default" | "search";
export type FeedStatus = "idle" | "loading" | "error";

type Page = {
  items: ProposicaoCard[];
  total: number;
};

export type FeedState = {
  mode: FeedMode;
  query: string;
  ordenacao: FeedOrdenacao;
  tema: number | null;
  defaultFeed: Page;
  searchFeed: Page;
  status: FeedStatus;
};

export type FeedAction =
  | { type: "searchStart"; query: string }
  | { type: "searchSuccess"; items: ProposicaoCard[]; total: number }
  | { type: "loadMoreStart" }
  | { type: "loadMoreSuccess"; items: ProposicaoCard[]; total: number }
  | { type: "loadError" }
  | { type: "clearSearch" }
  | { type: "changeOrdenacao"; ordenacao: FeedOrdenacao }
  | { type: "changeTema"; tema: number }
  | { type: "clearFilters" };

const emptyPage: Page = { items: [], total: 0 };

export function initFeedState(
  items: ProposicaoCard[],
  total: number,
  ordenacao: FeedOrdenacao = 'mais-votadas',
  tema: number | null = null,
  query = "",
): FeedState {
  const term = query.trim();
  if (term.length > 0) {
    return {
      mode: "search",
      query: term,
      ordenacao,
      tema,
      defaultFeed: emptyPage,
      searchFeed: { items, total },
      status: "idle",
    };
  }

  return {
    mode: "default",
    query: "",
    ordenacao,
    tema,
    defaultFeed: { items, total },
    searchFeed: emptyPage,
    status: "idle",
  };
}

export function activeFeed(state: FeedState): Page {
  return state.mode === "search" ? state.searchFeed : state.defaultFeed;
}

function appendToActive(state: FeedState, page: Page): FeedState {
  const current = activeFeed(state);
  const merged: Page = {
    items: [...current.items, ...page.items],
    total: page.total,
  };
  return state.mode === "search"
    ? { ...state, searchFeed: merged }
    : { ...state, defaultFeed: merged };
}

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "searchStart":
      return {
        ...state,
        mode: "search",
        query: action.query,
        searchFeed: emptyPage,
        status: "loading",
      };
    case "searchSuccess":
      return {
        ...state,
        searchFeed: { items: action.items, total: action.total },
        status: "idle",
      };
    case "loadMoreStart":
      return { ...state, status: "loading" };
    case "loadMoreSuccess":
      return {
        ...appendToActive(state, { items: action.items, total: action.total }),
        status: "idle",
      };
    case "loadError":
      return { ...state, status: "error" };
    case "clearSearch":
      return {
        ...state,
        mode: "default",
        query: "",
        searchFeed: emptyPage,
        status: "idle",
      };
    case "changeOrdenacao":
      return {
        ...state,
        ordenacao: action.ordenacao,
        mode: "default",
        defaultFeed: emptyPage,
        status: "loading",
      };
    case "changeTema":
      return {
        ...state,
        tema: action.tema,
        mode: "default",
        defaultFeed: emptyPage,
        status: "loading",
      };
    case "clearFilters":
      return {
        ...state,
        tema: null,
        mode: "default",
        defaultFeed: emptyPage,
        status: "loading",
      };
  }
}

export type FeedDisplay =
  | "results"
  | "loading"
  | "empty-default"
  | "empty-search"
  | "empty-filtered"
  | "error";

export function feedDisplay(state: FeedState): FeedDisplay {
  if (activeFeed(state).items.length > 0) return "results";
  if (state.status === "error") return "error";
  if (state.status === "loading") return "loading";
  if (state.mode === "search") return "empty-search";
  if (state.tema !== null) return "empty-filtered";
  return "empty-default";
}

export function nextOffset(state: FeedState): number {
  return activeFeed(state).items.length;
}

export function hasMore(state: FeedState): boolean {
  const feed = activeFeed(state);
  return feed.items.length < feed.total;
}
