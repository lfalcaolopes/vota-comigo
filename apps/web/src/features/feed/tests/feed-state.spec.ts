import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  feedReducer,
  hasMore,
  initFeedState,
  nextOffset,
} from "../lib/feed-state";

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
    it("starts idle with the given items and total", () => {
      // Arrange / Act
      const state = initFeedState(firstPage, 50);

      // Assert
      expect(state.items).toEqual(firstPage);
      expect(state.total).toBe(50);
      expect(state.status).toBe("idle");
    });
  });

  describe("when a load starts", () => {
    it("moves to loading without dropping the current items", () => {
      // Arrange
      const state = initFeedState(firstPage, 50);

      // Act
      const next = feedReducer(state, { type: "loadStart" });

      // Assert
      expect(next.status).toBe("loading");
      expect(next.items).toEqual(firstPage);
      expect(next.total).toBe(50);
    });
  });

  describe("when a load succeeds", () => {
    it("appends the new page by offset instead of replacing", () => {
      // Arrange
      const loading = feedReducer(initFeedState(firstPage, 50), {
        type: "loadStart",
      });
      const secondPage = [card(3), card(4)];

      // Act
      const next = feedReducer(loading, {
        type: "loadSuccess",
        items: secondPage,
        total: 50,
      });

      // Assert
      expect(next.items).toEqual([...firstPage, ...secondPage]);
      expect(next.status).toBe("idle");
    });

    it("updates the total from the response", () => {
      // Arrange
      const loading = feedReducer(initFeedState(firstPage, 50), {
        type: "loadStart",
      });

      // Act
      const next = feedReducer(loading, {
        type: "loadSuccess",
        items: [card(3)],
        total: 48,
      });

      // Assert
      expect(next.total).toBe(48);
    });
  });

  describe("when a load fails", () => {
    it("moves to error while keeping the items for retry", () => {
      // Arrange
      const loading = feedReducer(initFeedState(firstPage, 50), {
        type: "loadStart",
      });

      // Act
      const next = feedReducer(loading, { type: "loadError" });

      // Assert
      expect(next.status).toBe("error");
      expect(next.items).toEqual(firstPage);
    });
  });
});

describe("nextOffset", () => {
  it("reflects the number of loaded items", () => {
    // Arrange
    const state = initFeedState(firstPage, 50);

    // Act / Assert
    expect(nextOffset(state)).toBe(firstPage.length);
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
