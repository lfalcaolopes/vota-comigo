"use client";

import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { useReducer } from "react";

import { maisVotadas } from "@/shared/proposicao";

import {
  feedReducer,
  hasMore,
  initFeedState,
  nextOffset,
  type FeedStatus,
} from "../lib/feed-state";

const PAGE_SIZE = 20;

export type UseFeedState = {
  items: ProposicaoCard[];
  total: number;
  status: FeedStatus;
  canLoadMore: boolean;
  loadMore: () => Promise<void>;
};

export function useFeedState(
  initialItems: ProposicaoCard[],
  initialTotal: number,
): UseFeedState {
  const [state, dispatch] = useReducer(
    feedReducer,
    initFeedState(initialItems, initialTotal),
  );

  async function loadMore() {
    if (state.status === "loading") return;

    dispatch({ type: "loadStart" });

    try {
      const page = await maisVotadas(PAGE_SIZE, nextOffset(state));
      dispatch({
        type: "loadSuccess",
        items: page.items,
        total: page.total,
      });
    } catch {
      dispatch({ type: "loadError" });
    }
  }

  return {
    items: state.items,
    total: state.total,
    status: state.status,
    canLoadMore: hasMore(state),
    loadMore,
  };
}
