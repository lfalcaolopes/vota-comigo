import type { ProposicaoCard } from "@vota-comigo/shared-types";

export type FeedStatus = "idle" | "loading" | "error";

export type FeedState = {
  items: ProposicaoCard[];
  total: number;
  status: FeedStatus;
};

export type FeedAction =
  | { type: "loadStart" }
  | { type: "loadSuccess"; items: ProposicaoCard[]; total: number }
  | { type: "loadError" };

export function initFeedState(
  items: ProposicaoCard[],
  total: number,
): FeedState {
  return { items, total, status: "idle" };
}

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "loadStart":
      return { ...state, status: "loading" };
    case "loadSuccess":
      return {
        items: [...state.items, ...action.items],
        total: action.total,
        status: "idle",
      };
    case "loadError":
      return { ...state, status: "error" };
  }
}

export function nextOffset(state: FeedState): number {
  return state.items.length;
}

export function hasMore(state: FeedState): boolean {
  return state.items.length < state.total;
}
