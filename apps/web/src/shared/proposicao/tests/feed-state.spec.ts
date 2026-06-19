import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
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
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2023-05-10",
    volumeVotacoesPlenario: 9,
    dataUltimaVotacao: "2025-03-14",
  };
}

const firstPage = [card(1), card(2)];

describe("initFeedState", () => {
  describe("when initialised with no criteria", () => {
    it("starts idle, with the given items and total", () => {
      // Arrange / Act
      const state = initFeedState(firstPage, 50);

      // Assert
      expect(state.query).toBe("");
      expect(state.tema).toBeNull();
      expect(state.feed.items).toEqual(firstPage);
      expect(state.feed.total).toBe(50);
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

  describe("when initialised with a query", () => {
    it("stores the trimmed query and the items as the feed", () => {
      // Arrange / Act
      const state = initFeedState(firstPage, 2, "mais-recentes", 37, " saúde ");

      // Assert
      expect(state.query).toBe("saúde");
      expect(state.ordenacao).toBe("mais-recentes");
      expect(state.tema).toBe(37);
      expect(state.feed.items).toEqual(firstPage);
      expect(state.feed.total).toBe(2);
    });
  });

  describe("when initialised with a tema", () => {
    it("stores the tema", () => {
      // Arrange / Act
      const state = initFeedState(firstPage, 50, "mais-votadas", 37);

      // Assert
      expect(state.tema).toBe(37);
    });

    it("defaults tema to null when not provided", () => {
      // Arrange / Act
      const state = initFeedState(firstPage, 50);

      // Assert
      expect(state.tema).toBeNull();
    });
  });
});

describe("feedReducer", () => {
  describe("when changeQuery is dispatched", () => {
    it("records the new query, clears the feed, and starts loading", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act
      const next = feedReducer(state, { type: "changeQuery", query: "saúde" });

      // Assert
      expect(next.query).toBe("saúde");
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });

    it("preserves tema and ordenacao", () => {
      // Arrange
      const state = initFeedState(firstPage, 50, "mais-recentes", 37);

      // Act
      const next = feedReducer(state, { type: "changeQuery", query: "saúde" });

      // Assert
      expect(next.tema).toBe(37);
      expect(next.ordenacao).toBe("mais-recentes");
    });
  });

  describe("when clearSearch is dispatched", () => {
    it("clears the query but preserves tema and ordenacao, and resets the feed to loading", () => {
      // Arrange
      const state = initFeedState(firstPage, 50, "mais-recentes", 37, "saúde");

      // Act
      const next = feedReducer(state, { type: "clearSearch" });

      // Assert
      expect(next.query).toBe("");
      expect(next.tema).toBe(37);
      expect(next.ordenacao).toBe("mais-recentes");
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });
  });

  describe("when changeOrdenacao is dispatched", () => {
    it("records the new ordenacao, clears the feed, and starts loading", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act
      const next = feedReducer(state, {
        type: "changeOrdenacao",
        ordenacao: "mais-recentes",
      });

      // Assert
      expect(next.ordenacao).toBe("mais-recentes");
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });

    it("preserves query and tema", () => {
      // Arrange
      const state = initFeedState(firstPage, 50, "mais-votadas", 37, "saúde");

      // Act
      const next = feedReducer(state, {
        type: "changeOrdenacao",
        ordenacao: "mais-recentes",
      });

      // Assert
      expect(next.query).toBe("saúde");
      expect(next.tema).toBe(37);
    });

    it("switching ordenacao back leaves no stale items", () => {
      // Arrange
      const withNew = feedReducer(initFeedState(firstPage, 50), {
        type: "changeOrdenacao",
        ordenacao: "mais-recentes",
      });

      // Act
      const back = feedReducer(withNew, {
        type: "changeOrdenacao",
        ordenacao: "mais-votadas",
      });

      // Assert
      expect(back.ordenacao).toBe("mais-votadas");
      expect(back.feed.items).toEqual([]);
    });
  });

  describe("when changeTema is dispatched", () => {
    it("records the tema, clears the feed, and starts loading", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act
      const next = feedReducer(state, { type: "changeTema", tema: 37 });

      // Assert
      expect(next.tema).toBe(37);
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });

    it("preserves query and ordenacao", () => {
      // Arrange
      const state = initFeedState(firstPage, 50, "mais-recentes", null, "saúde");

      // Act
      const next = feedReducer(state, { type: "changeTema", tema: 37 });

      // Assert
      expect(next.query).toBe("saúde");
      expect(next.ordenacao).toBe("mais-recentes");
    });
  });

  describe("when clearTema is dispatched", () => {
    it("clears only tema while preserving query and ordenacao, and starts loading", () => {
      // Arrange
      const state = initFeedState(firstPage, 50, "mais-recentes", 37, "saúde");

      // Act
      const next = feedReducer(state, { type: "clearTema" });

      // Assert
      expect(next.tema).toBeNull();
      expect(next.query).toBe("saúde");
      expect(next.ordenacao).toBe("mais-recentes");
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });
  });

  describe("when clearFilters is dispatched", () => {
    it("clears query and tema while preserving ordenacao, and starts loading", () => {
      // Arrange
      const state = feedReducer(
        initFeedState(firstPage, 50, "mais-recentes", null, "saúde"),
        { type: "changeTema", tema: 37 },
      );

      // Act
      const next = feedReducer(state, { type: "clearFilters" });

      // Assert
      expect(next.query).toBe("");
      expect(next.tema).toBeNull();
      expect(next.ordenacao).toBe("mais-recentes");
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });
  });

  describe("when loadMoreStart is dispatched", () => {
    it("moves to loading without dropping the current items", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act
      const next = feedReducer(state, { type: "loadMoreStart" });

      // Assert
      expect(next.status).toBe("loading");
      expect(next.feed.items).toEqual(firstPage);
    });
  });

  describe("when loadMoreSuccess is dispatched", () => {
    it("appends the new page to the existing items", () => {
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
      expect(next.feed.items).toEqual([...firstPage, ...secondPage]);
      expect(next.status).toBe("idle");
    });
  });

  describe("when feedSuccess is dispatched", () => {
    it("replaces the feed with the new items (not appends)", () => {
      // Arrange
      const loading = feedReducer(initFeedState(firstPage, 50), {
        type: "changeQuery",
        query: "saúde",
      });

      // Act
      const next = feedReducer(loading, {
        type: "feedSuccess",
        items: [card(7)],
        total: 1,
      });

      // Assert
      expect(next.feed.items).toEqual([card(7)]);
      expect(next.feed.total).toBe(1);
      expect(next.status).toBe("idle");
    });
  });

  describe("when loadError is dispatched", () => {
    it("moves to error while keeping the active items for retry", () => {
      // Arrange
      const loading = feedReducer(initFeedState(firstPage, 50), {
        type: "loadMoreStart",
      });

      // Act
      const next = feedReducer(loading, { type: "loadError" });

      // Assert
      expect(next.status).toBe("error");
      expect(next.feed.items).toEqual(firstPage);
    });
  });
});

describe("nextOffset", () => {
  it("reflects the number of loaded items in the feed", () => {
    // Arrange
    const state = initFeedState(firstPage, 50);

    // Act / Assert
    expect(nextOffset(state)).toBe(firstPage.length);
  });

  it("reflects the feed length after load-more", () => {
    // Arrange
    const state = feedReducer(
      feedReducer(initFeedState(firstPage, 50), { type: "loadMoreStart" }),
      { type: "loadMoreSuccess", items: [card(7)], total: 50 },
    );

    // Act / Assert
    expect(nextOffset(state)).toBe(3);
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
  describe("when there are items", () => {
    it("shows results", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act / Assert
      expect(feedDisplay(state)).toBe("results");
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

  describe("when empty with no active criteria", () => {
    it("shows empty-default", () => {
      // Arrange
      const state = initFeedState([], 0);

      // Act / Assert
      expect(feedDisplay(state)).toBe("empty-default");
    });
  });

  describe("when empty with query active", () => {
    it("shows empty-filtered", () => {
      // Arrange
      const state = feedReducer(
        feedReducer(initFeedState(firstPage, 50), {
          type: "changeQuery",
          query: "xyz",
        }),
        { type: "feedSuccess", items: [], total: 0 },
      );

      // Act / Assert
      expect(feedDisplay(state)).toBe("empty-filtered");
    });
  });

  describe("when empty with tema active", () => {
    it("shows empty-filtered", () => {
      // Arrange
      const state = feedReducer(
        feedReducer(initFeedState([], 0), {
          type: "changeTema",
          tema: 37,
        }),
        { type: "feedSuccess", items: [], total: 0 },
      );

      // Act / Assert
      expect(feedDisplay(state)).toBe("empty-filtered");
    });
  });

  describe("when loading with no items", () => {
    it("shows loading", () => {
      // Arrange
      const state = feedReducer(initFeedState([], 0), {
        type: "changeQuery",
        query: "saúde",
      });

      // Act / Assert
      expect(feedDisplay(state)).toBe("loading");
    });
  });

  describe("when a load fails with no items to show", () => {
    it("shows error", () => {
      // Arrange
      const state = feedReducer(
        feedReducer(initFeedState([], 0), { type: "changeQuery", query: "xyz" }),
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
