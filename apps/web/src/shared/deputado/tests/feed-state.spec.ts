import type { DeputadoCard } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  deputadoFeedDisplay,
  deputadoFeedReducer,
  deputadoHasMore,
  deputadoNextOffset,
  initDeputadoFeedState,
} from "../feed-state";

function card(externalIdDeputado: number): DeputadoCard {
  return {
    externalIdDeputado,
    nomePublico: `Deputada ${externalIdDeputado}`,
    nomeCivil: null,
    siglaPartido: "PT",
    siglaUf: "SP",
    urlFoto: null,
    emAtividade: true,
  };
}

const firstPage = [card(1), card(2)];

describe("initDeputadoFeedState", () => {
  describe("when initialised with filters", () => {
    it("stores items, total, query, activity, and UF", () => {
      // Arrange / Act
      const state = initDeputadoFeedState(
        firstPage,
        50,
        " maria ",
        true,
        "SP",
        "PT",
      );

      // Assert
      expect(state.query).toBe("maria");
      expect(state.emAtividade).toBe(true);
      expect(state.uf).toBe("SP");
      expect(state.partido).toBe("PT");
      expect(state.feed.items).toEqual(firstPage);
      expect(state.feed.total).toBe(50);
      expect(state.status).toBe("idle");
    });
  });
});

describe("deputadoFeedReducer", () => {
  describe("when changeQuery is dispatched", () => {
    it("records the query, clears items, and starts loading", () => {
      // Arrange
      const state = initDeputadoFeedState(firstPage, 50);

      // Act
      const next = deputadoFeedReducer(state, {
        type: "changeQuery",
        query: "maria",
      });

      // Assert
      expect(next.query).toBe("maria");
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });
  });

  describe("when toggleEmAtividade is dispatched", () => {
    it("toggles activity while preserving query, UF, and partido", () => {
      // Arrange
      const state = initDeputadoFeedState(
        firstPage,
        50,
        "maria",
        false,
        "SP",
        "PT",
      );

      // Act
      const next = deputadoFeedReducer(state, { type: "toggleEmAtividade" });

      // Assert
      expect(next.emAtividade).toBe(true);
      expect(next.query).toBe("maria");
      expect(next.uf).toBe("SP");
      expect(next.partido).toBe("PT");
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });
  });

  describe("when changePartido is dispatched", () => {
    it("records the partido, clears items, and starts loading", () => {
      // Arrange
      const state = initDeputadoFeedState(firstPage, 50);

      // Act
      const next = deputadoFeedReducer(state, {
        type: "changePartido",
        partido: "PSOL",
      });

      // Assert
      expect(next.partido).toBe("PSOL");
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });
  });

  describe("when changeUf is dispatched", () => {
    it("records the UF, clears items, and starts loading", () => {
      // Arrange
      const state = initDeputadoFeedState(firstPage, 50);

      // Act
      const next = deputadoFeedReducer(state, { type: "changeUf", uf: "RJ" });

      // Assert
      expect(next.uf).toBe("RJ");
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });
  });

  describe("when loadMoreSuccess is dispatched", () => {
    it("appends the new page", () => {
      // Arrange
      const loading = deputadoFeedReducer(initDeputadoFeedState(firstPage, 50), {
        type: "loadMoreStart",
      });

      // Act
      const next = deputadoFeedReducer(loading, {
        type: "loadMoreSuccess",
        items: [card(3)],
        total: 50,
      });

      // Assert
      expect(next.feed.items).toEqual([...firstPage, card(3)]);
      expect(next.status).toBe("idle");
    });
  });
});

describe("deputadoFeedDisplay", () => {
  it("uses empty-filtered when filters are active and no items are loaded", () => {
    // Arrange
    const state = initDeputadoFeedState([], 0, "", false, null, "PT");

    // Act / Assert
    expect(deputadoFeedDisplay(state)).toBe("empty-filtered");
  });

  it("uses error when the empty feed is in error state", () => {
    // Arrange
    const state = deputadoFeedReducer(initDeputadoFeedState([], 0), {
      type: "loadError",
    });

    // Act / Assert
    expect(deputadoFeedDisplay(state)).toBe("error");
  });
});

describe("deputadoNextOffset and deputadoHasMore", () => {
  it("derive pagination state from the loaded items and total", () => {
    // Arrange
    const state = initDeputadoFeedState(firstPage, 50);

    // Act / Assert
    expect(deputadoNextOffset(state)).toBe(2);
    expect(deputadoHasMore(state)).toBe(true);
  });
});
