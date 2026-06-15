import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  activeFeed,
  feedDisplay,
  feedReducer,
  hasMore,
  initFeedState,
  nextOffset,
} from "../feed-state";

function card(externalIdProposicao: number): ProposicaoCard {
  return {
    externalIdProposicao,
    siglaTipo: "PL",
    numero: externalIdProposicao,
    ano: 2023,
    ementa: "Dispõe sobre alguma coisa.",
    dataApresentacao: "2023-05-10",
    volumeVotacoesPlenario: 9,
    dataUltimaVotacao: "2025-03-14",
  };
}

const firstPage = [card(1), card(2)];

describe("feedReducer", () => {
  describe("when initialised", () => {
    it("starts in default mode, idle, with the given items and total", () => {
      // Arrange / Act
      const state = initFeedState(firstPage, 50);

      // Assert
      expect(state.mode).toBe("default");
      expect(state.query).toBe("");
      expect(activeFeed(state).items).toEqual(firstPage);
      expect(activeFeed(state).total).toBe(50);
      expect(state.status).toBe("idle");
    });

    it("starts with ordenacao mais-votadas", () => {
      // Arrange / Act
      const state = initFeedState(firstPage, 50);

      // Assert
      expect(state.ordenacao).toBe("mais-votadas");
    });

    it("accepts a custom initial ordenacao", () => {
      // Arrange / Act
      const state = initFeedState(firstPage, 50, "mais-recentes");

      // Assert
      expect(state.ordenacao).toBe("mais-recentes");
    });
  });

  describe("when ordenacao is changed", () => {
    it("records the new ordenacao and resets the default feed to loading", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act
      const next = feedReducer(state, {
        type: "changeOrdenacao",
        ordenacao: "mais-recentes",
      });

      // Assert
      expect(next.ordenacao).toBe("mais-recentes");
      expect(next.status).toBe("loading");
      expect(activeFeed(next).items).toEqual([]);
    });

    it("preserves the active mode as default", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act
      const next = feedReducer(state, {
        type: "changeOrdenacao",
        ordenacao: "mais-recentes",
      });

      // Assert
      expect(next.mode).toBe("default");
    });

    it("switching ordenacao back preserves no stale items", () => {
      // Arrange
      const withNewOrdenacao = feedReducer(initFeedState(firstPage, 50), {
        type: "changeOrdenacao",
        ordenacao: "mais-recentes",
      });

      // Act
      const back = feedReducer(withNewOrdenacao, {
        type: "changeOrdenacao",
        ordenacao: "mais-votadas",
      });

      // Assert
      expect(back.ordenacao).toBe("mais-votadas");
      expect(activeFeed(back).items).toEqual([]);
    });
  });

  describe("when loading more in the default feed", () => {
    it("moves to loading without dropping the current items", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act
      const next = feedReducer(state, { type: "loadMoreStart" });

      // Assert
      expect(next.status).toBe("loading");
      expect(activeFeed(next).items).toEqual(firstPage);
    });

    it("appends the new page by offset instead of replacing", () => {
      // Arrange
      const loading = feedReducer(initFeedState(firstPage, 50), {
        type: "loadMoreStart",
      });
      const secondPage = [card(3), card(4)];

      // Act
      const next = feedReducer(loading, {
        type: "loadMoreSuccess",
        items: secondPage,
        total: 50,
      });

      // Assert
      expect(activeFeed(next).items).toEqual([...firstPage, ...secondPage]);
      expect(next.status).toBe("idle");
    });
  });

  describe("when a search is submitted", () => {
    it("switches to search mode, stores the term, and starts loading", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act
      const next = feedReducer(state, { type: "searchStart", query: "saúde" });

      // Assert
      expect(next.mode).toBe("search");
      expect(next.query).toBe("saúde");
      expect(next.status).toBe("loading");
      expect(activeFeed(next).items).toEqual([]);
    });

    it("keeps the default feed preserved underneath", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act
      const next = feedReducer(state, { type: "searchStart", query: "saúde" });

      // Assert
      expect(next.defaultFeed.items).toEqual(firstPage);
      expect(next.defaultFeed.total).toBe(50);
    });
  });

  describe("when search results arrive", () => {
    it("replaces the search feed with the results", () => {
      // Arrange
      const searching = feedReducer(initFeedState(firstPage, 50), {
        type: "searchStart",
        query: "saúde",
      });
      const results = [card(7)];

      // Act
      const next = feedReducer(searching, {
        type: "searchSuccess",
        items: results,
        total: 1,
      });

      // Assert
      expect(activeFeed(next).items).toEqual(results);
      expect(activeFeed(next).total).toBe(1);
      expect(next.status).toBe("idle");
    });

    it("appends further pages onto the search feed by offset", () => {
      // Arrange
      const withResults = feedReducer(
        feedReducer(initFeedState(firstPage, 50), {
          type: "searchStart",
          query: "saúde",
        }),
        { type: "searchSuccess", items: [card(7)], total: 3 },
      );
      const loading = feedReducer(withResults, { type: "loadMoreStart" });

      // Act
      const next = feedReducer(loading, {
        type: "loadMoreSuccess",
        items: [card(8)],
        total: 3,
      });

      // Assert
      expect(activeFeed(next).items).toEqual([card(7), card(8)]);
    });

    it("yields an empty search feed when there are no matches", () => {
      // Arrange
      const searching = feedReducer(initFeedState(firstPage, 50), {
        type: "searchStart",
        query: "xyz",
      });

      // Act
      const next = feedReducer(searching, {
        type: "searchSuccess",
        items: [],
        total: 0,
      });

      // Assert
      expect(next.mode).toBe("search");
      expect(activeFeed(next).items).toEqual([]);
      expect(next.status).toBe("idle");
    });
  });

  describe("when the search is cleared", () => {
    it("returns to the default feed kept intact", () => {
      // Arrange
      const searching = feedReducer(
        feedReducer(initFeedState(firstPage, 50), {
          type: "searchStart",
          query: "saúde",
        }),
        { type: "searchSuccess", items: [card(7)], total: 1 },
      );

      // Act
      const next = feedReducer(searching, { type: "clearSearch" });

      // Assert
      expect(next.mode).toBe("default");
      expect(next.query).toBe("");
      expect(activeFeed(next).items).toEqual(firstPage);
      expect(activeFeed(next).total).toBe(50);
    });
  });

  describe("when a load fails", () => {
    it("moves to error while keeping the active items for retry", () => {
      // Arrange
      const loading = feedReducer(initFeedState(firstPage, 50), {
        type: "loadMoreStart",
      });

      // Act
      const next = feedReducer(loading, { type: "loadError" });

      // Assert
      expect(next.status).toBe("error");
      expect(activeFeed(next).items).toEqual(firstPage);
    });
  });
});

describe("nextOffset", () => {
  it("reflects the number of loaded items in the default feed", () => {
    // Arrange
    const state = initFeedState(firstPage, 50);

    // Act / Assert
    expect(nextOffset(state)).toBe(firstPage.length);
  });

  it("reflects the search feed length in search mode", () => {
    // Arrange
    const state = feedReducer(
      feedReducer(initFeedState(firstPage, 50), {
        type: "searchStart",
        query: "saúde",
      }),
      { type: "searchSuccess", items: [card(7)], total: 3 },
    );

    // Act / Assert
    expect(nextOffset(state)).toBe(1);
  });
});

describe("hasMore", () => {
  describe("when fewer items than the total are loaded", () => {
    it("is true", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act / Assert
      expect(hasMore(state)).toBe(true);
    });
  });

  describe("when every item has been loaded", () => {
    it("is false", () => {
      // Arrange
      const state = initFeedState(firstPage, firstPage.length);

      // Act / Assert
      expect(hasMore(state)).toBe(false);
    });
  });
});

describe("feedDisplay", () => {
  describe("in the default feed", () => {
    it("shows results when there are items", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act / Assert
      expect(feedDisplay(state)).toBe("results");
    });

    it("shows the default empty state when there are no items", () => {
      // Arrange
      const state = initFeedState([], 0);

      // Act / Assert
      expect(feedDisplay(state)).toBe("empty-default");
    });

    it("keeps showing results while loading more over existing items", () => {
      // Arrange
      const state = feedReducer(initFeedState(firstPage, 50), {
        type: "loadMoreStart",
      });

      // Act / Assert
      expect(feedDisplay(state)).toBe("results");
    });
  });

  describe("in the search feed", () => {
    it("shows loading while the initial search is in flight", () => {
      // Arrange
      const state = feedReducer(initFeedState(firstPage, 50), {
        type: "searchStart",
        query: "saúde",
      });

      // Act / Assert
      expect(feedDisplay(state)).toBe("loading");
    });

    it("shows results when matches arrive", () => {
      // Arrange
      const state = feedReducer(
        feedReducer(initFeedState(firstPage, 50), {
          type: "searchStart",
          query: "saúde",
        }),
        { type: "searchSuccess", items: [card(7)], total: 1 },
      );

      // Act / Assert
      expect(feedDisplay(state)).toBe("results");
    });

    it("shows the search empty state when there are no matches", () => {
      // Arrange
      const state = feedReducer(
        feedReducer(initFeedState(firstPage, 50), {
          type: "searchStart",
          query: "xyz",
        }),
        { type: "searchSuccess", items: [], total: 0 },
      );

      // Act / Assert
      expect(feedDisplay(state)).toBe("empty-search");
    });
  });

  describe("when a load fails", () => {
    it("shows the error state when no items are left to show", () => {
      // Arrange
      const state = feedReducer(
        feedReducer(initFeedState(firstPage, 50), {
          type: "searchStart",
          query: "saúde",
        }),
        { type: "loadError" },
      );

      // Act / Assert
      expect(feedDisplay(state)).toBe("error");
    });

    it("keeps showing results when items remain for inline retry", () => {
      // Arrange
      const state = feedReducer(
        feedReducer(initFeedState(firstPage, 50), { type: "loadMoreStart" }),
        { type: "loadError" },
      );

      // Act / Assert
      expect(feedDisplay(state)).toBe("results");
    });
  });
});
