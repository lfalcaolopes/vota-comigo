import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { FILTROS_PADRAO, type ProposicaoFeedFiltros } from "../feed-filtros";
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

function filtros(
  overrides: Partial<ProposicaoFeedFiltros> = {},
): ProposicaoFeedFiltros {
  return { ...FILTROS_PADRAO, ...overrides };
}

describe("initFeedState", () => {
  describe("when initialised with no criteria", () => {
    it("starts idle, with the given items and total", () => {
      // Arrange / Act
      const state = initFeedState({ items: firstPage, total: 50 });

      // Assert
      expect(state.query).toBe("");
      expect(state.filtros.tema).toBeNull();
      expect(state.feed.items).toEqual(firstPage);
      expect(state.feed.total).toBe(50);
      expect(state.status).toBe("idle");
    });

    it("starts with ordenacao mais-votadas", () => {
      // Arrange / Act
      const state = initFeedState({ items: firstPage, total: 50 });

      // Assert
      expect(state.filtros.ordenacao).toBe("mais-votadas");
    });

    it("accepts a custom initial ordenacao", () => {
      // Arrange / Act
      const state = initFeedState({
        items: firstPage,
        total: 50,
        filtros: filtros({ ordenacao: "mais-recentes" }),
      });

      // Assert
      expect(state.filtros.ordenacao).toBe("mais-recentes");
    });
  });

  describe("when initialised with a query", () => {
    it("stores the trimmed query and the items as the feed", () => {
      // Arrange / Act
      const state = initFeedState({
        items: firstPage,
        total: 2,
        query: " saúde ",
        filtros: filtros({ ordenacao: "mais-recentes", tema: 37 }),
      });

      // Assert
      expect(state.query).toBe("saúde");
      expect(state.filtros.ordenacao).toBe("mais-recentes");
      expect(state.filtros.tema).toBe(37);
      expect(state.feed.items).toEqual(firstPage);
      expect(state.feed.total).toBe(2);
    });
  });

  describe("when initialised with a tema", () => {
    it("stores the tema", () => {
      // Arrange / Act
      const state = initFeedState({
        items: firstPage,
        total: 50,
        filtros: filtros({ tema: 37 }),
      });

      // Assert
      expect(state.filtros.tema).toBe(37);
    });

    it("defaults tema to null when not provided", () => {
      // Arrange / Act
      const state = initFeedState({ items: firstPage, total: 50 });

      // Assert
      expect(state.filtros.tema).toBeNull();
    });
  });
});

describe("feedReducer", () => {
  describe("when changeQuery is dispatched", () => {
    it("records the new query, clears the feed, and starts loading", () => {
      // Arrange
      const state = initFeedState({ items: firstPage, total: 50 });

      // Act
      const next = feedReducer(state, { type: "changeQuery", query: "saúde" });

      // Assert
      expect(next.query).toBe("saúde");
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });

    it("preserves tema and ordenacao", () => {
      // Arrange
      const state = initFeedState({
        items: firstPage,
        total: 50,
        filtros: filtros({ ordenacao: "mais-recentes", tema: 37 }),
      });

      // Act
      const next = feedReducer(state, { type: "changeQuery", query: "saúde" });

      // Assert
      expect(next.filtros.tema).toBe(37);
      expect(next.filtros.ordenacao).toBe("mais-recentes");
    });
  });

  describe("when clearSearch is dispatched", () => {
    it("clears the query but preserves tema and ordenacao, and resets the feed to loading", () => {
      // Arrange
      const state = initFeedState({
        items: firstPage,
        total: 50,
        query: "saúde",
        filtros: filtros({ ordenacao: "mais-recentes", tema: 37 }),
      });

      // Act
      const next = feedReducer(state, { type: "clearSearch" });

      // Assert
      expect(next.query).toBe("");
      expect(next.filtros.tema).toBe(37);
      expect(next.filtros.ordenacao).toBe("mais-recentes");
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });
  });

  describe("when applyFiltros is dispatched", () => {
    it("records the whole set, clears the feed, and starts loading", () => {
      // Arrange
      const state = initFeedState({ items: firstPage, total: 50 });

      // Act
      const next = feedReducer(state, {
        type: "applyFiltros",
        filtros: filtros({ ordenacao: "mais-recentes", tema: 37 }),
      });

      // Assert
      expect(next.filtros).toEqual(
        filtros({ ordenacao: "mais-recentes", tema: 37 }),
      );
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });

    it("preserves the active query", () => {
      // Arrange
      const state = initFeedState({
        items: firstPage,
        total: 50,
        query: "saúde",
      });

      // Act
      const next = feedReducer(state, {
        type: "applyFiltros",
        filtros: filtros({ tema: 37 }),
      });

      // Assert
      expect(next.query).toBe("saúde");
    });

    it("leaves no stale items when a filter goes back to the default", () => {
      // Arrange
      const comTema = feedReducer(
        initFeedState({ items: firstPage, total: 50 }),
        { type: "applyFiltros", filtros: filtros({ tema: 37 }) },
      );
      const carregado = feedReducer(comTema, {
        type: "feedSuccess",
        items: [card(9)],
        total: 1,
      });

      // Act
      const next = feedReducer(carregado, {
        type: "applyFiltros",
        filtros: FILTROS_PADRAO,
      });

      // Assert
      expect(next.filtros).toEqual(FILTROS_PADRAO);
      expect(next.feed.items).toEqual([]);
    });
  });

  describe("when clearTudo is dispatched", () => {
    it("clears the query and every filter, including the ordenacao", () => {
      // Arrange
      const state = initFeedState({
        items: firstPage,
        total: 50,
        query: "saúde",
        filtros: filtros({ ordenacao: "mais-recentes", tema: 37 }),
      });

      // Act
      const next = feedReducer(state, { type: "clearTudo" });

      // Assert
      expect(next.query).toBe("");
      expect(next.filtros).toEqual(FILTROS_PADRAO);
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });
  });

  describe("when loadMoreStart is dispatched", () => {
    it("moves to loading without dropping the current items", () => {
      // Arrange
      const state = initFeedState({ items: firstPage, total: 50 });

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
      const loading = feedReducer(
        initFeedState({ items: firstPage, total: 50 }),
        {
          type: "loadMoreStart",
        },
      );
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
      const loading = feedReducer(
        initFeedState({ items: firstPage, total: 50 }),
        {
          type: "changeQuery",
          query: "saúde",
        },
      );

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
      const loading = feedReducer(
        initFeedState({ items: firstPage, total: 50 }),
        {
          type: "loadMoreStart",
        },
      );

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
    const state = initFeedState({ items: firstPage, total: 50 });

    // Act / Assert
    expect(nextOffset(state)).toBe(firstPage.length);
  });

  it("reflects the feed length after load-more", () => {
    // Arrange
    const state = feedReducer(
      feedReducer(initFeedState({ items: firstPage, total: 50 }), {
        type: "loadMoreStart",
      }),
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
      const state = initFeedState({ items: firstPage, total: 50 });

      // Act / Assert
      expect(hasMore(state)).toBe(true);
    });
  });

  describe("when every item has been loaded", () => {
    it("is false", () => {
      // Arrange
      const state = initFeedState({
        items: firstPage,
        total: firstPage.length,
      });

      // Act / Assert
      expect(hasMore(state)).toBe(false);
    });
  });
});

describe("feedDisplay", () => {
  describe("when there are items", () => {
    it("shows results", () => {
      // Arrange
      const state = initFeedState({ items: firstPage, total: 50 });

      // Act / Assert
      expect(feedDisplay(state)).toBe("results");
    });

    it("keeps showing results while loading more over existing items", () => {
      // Arrange
      const state = feedReducer(
        initFeedState({ items: firstPage, total: 50 }),
        {
          type: "loadMoreStart",
        },
      );

      // Act / Assert
      expect(feedDisplay(state)).toBe("results");
    });
  });

  describe("when empty with no active criteria", () => {
    it("shows empty-default", () => {
      // Arrange
      const state = initFeedState({ items: [], total: 0 });

      // Act / Assert
      expect(feedDisplay(state)).toBe("empty-default");
    });
  });

  describe("when empty with query active", () => {
    it("shows empty-filtered", () => {
      // Arrange
      const state = feedReducer(
        feedReducer(initFeedState({ items: firstPage, total: 50 }), {
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
        feedReducer(initFeedState({ items: [], total: 0 }), {
          type: "applyFiltros",
          filtros: filtros({ tema: 37 }),
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
      const state = feedReducer(initFeedState({ items: [], total: 0 }), {
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
        feedReducer(initFeedState({ items: [], total: 0 }), {
          type: "changeQuery",
          query: "xyz",
        }),
        { type: "loadError" },
      );

      // Act / Assert
      expect(feedDisplay(state)).toBe("error");
    });

    it("keeps showing results when items remain for inline retry", () => {
      // Arrange
      const state = feedReducer(
        feedReducer(initFeedState({ items: firstPage, total: 50 }), {
          type: "loadMoreStart",
        }),
        { type: "loadError" },
      );

      // Act / Assert
      expect(feedDisplay(state)).toBe("results");
    });
  });
});
