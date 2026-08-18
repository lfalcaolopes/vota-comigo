import type { DeputadoCard } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { FILTROS_PADRAO, type DeputadoFeedFiltros } from "../feed-filtros";
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

function init(
  overrides: {
    items?: DeputadoCard[];
    total?: number;
    query?: string;
    filtros?: Partial<DeputadoFeedFiltros>;
  } = {},
) {
  return initDeputadoFeedState({
    items: overrides.items ?? firstPage,
    total: overrides.total ?? 50,
    query: overrides.query ?? "",
    filtros: { ...FILTROS_PADRAO, ...overrides.filtros },
  });
}

describe("initDeputadoFeedState", () => {
  describe("when initialised with filters", () => {
    it("stores items, total, query, and the applied filters", () => {
      // Act
      const state = init({
        query: " maria ",
        filtros: {
          incluirForaDeExercicio: true,
          ufs: ["SP"],
          partidos: ["PT"],
        },
      });

      // Assert
      expect(state.query).toBe("maria");
      expect(state.filtros).toEqual({
        ...FILTROS_PADRAO,
        incluirForaDeExercicio: true,
        ufs: ["SP"],
        partidos: ["PT"],
      });
      expect(state.feed.items).toEqual(firstPage);
      expect(state.feed.total).toBe(50);
      expect(state.status).toBe("idle");
    });
  });
});

describe("deputadoFeedReducer", () => {
  describe("when the search term changes", () => {
    it("records the query, clears items, and starts loading", () => {
      // Arrange
      const state = init();

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

    it("keeps the applied filters when the search is cleared", () => {
      // Arrange
      const state = init({ query: "maria", filtros: { ufs: ["SP"] } });

      // Act
      const next = deputadoFeedReducer(state, { type: "clearSearch" });

      // Assert
      expect(next.query).toBe("");
      expect(next.filtros.ufs).toEqual(["SP"]);
    });
  });

  describe("when a filter set is applied", () => {
    it("replaces every filter at once and starts loading", () => {
      // Arrange
      const state = init({ filtros: { ufs: ["SP"], partidos: ["PT"] } });

      // Act
      const next = deputadoFeedReducer(state, {
        type: "applyFiltros",
        filtros: {
          ...FILTROS_PADRAO,
          incluirForaDeExercicio: true,
          ufs: ["RJ"],
        },
      });

      // Assert
      expect(next.filtros).toEqual({
        ...FILTROS_PADRAO,
        incluirForaDeExercicio: true,
        ufs: ["RJ"],
      });
      expect(next.feed.items).toEqual([]);
      expect(next.status).toBe("loading");
    });

    it("keeps the search term, because the search lives outside the panel", () => {
      // Arrange
      const state = init({ query: "maria" });

      // Act
      const next = deputadoFeedReducer(state, {
        type: "applyFiltros",
        filtros: FILTROS_PADRAO,
      });

      // Assert
      expect(next.query).toBe("maria");
    });

    it("clears a filter that the applied set leaves at its default", () => {
      // Arrange
      const state = init({ filtros: { ufs: ["SP"], partidos: ["PT"] } });

      // Act
      const next = deputadoFeedReducer(state, {
        type: "applyFiltros",
        filtros: { ...FILTROS_PADRAO, partidos: ["PT"] },
      });

      // Assert
      expect(next.filtros.ufs).toEqual([]);
      expect(next.filtros.partidos).toEqual(["PT"]);
    });
  });

  describe("when everything is cleared from the empty list", () => {
    it("drops the search term along with the filters", () => {
      // Arrange
      const state = init({
        query: "maria",
        filtros: {
          incluirForaDeExercicio: true,
          ufs: ["SP"],
          partidos: ["PT"],
        },
      });

      // Act
      const next = deputadoFeedReducer(state, { type: "clearTudo" });

      // Assert
      expect(next.query).toBe("");
      expect(next.filtros).toEqual(FILTROS_PADRAO);
      expect(next.status).toBe("loading");
    });
  });

  describe("when a further page arrives", () => {
    it("appends the new page", () => {
      // Arrange
      const loading = deputadoFeedReducer(init(), { type: "loadMoreStart" });

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
    const state = init({ items: [], total: 0, filtros: { partidos: ["PT"] } });

    // Act / Assert
    expect(deputadoFeedDisplay(state)).toBe("empty-filtered");
  });

  it("uses empty-default when nothing is filtered and no items are loaded", () => {
    // Arrange
    const state = init({ items: [], total: 0 });

    // Act / Assert
    expect(deputadoFeedDisplay(state)).toBe("empty-default");
  });

  it("uses error when the empty feed is in error state", () => {
    // Arrange
    const state = deputadoFeedReducer(init({ items: [], total: 0 }), {
      type: "loadError",
    });

    // Act / Assert
    expect(deputadoFeedDisplay(state)).toBe("error");
  });
});

describe("deputadoNextOffset and deputadoHasMore", () => {
  it("derive pagination state from the loaded items and total", () => {
    // Arrange
    const state = init();

    // Act / Assert
    expect(deputadoNextOffset(state)).toBe(2);
    expect(deputadoHasMore(state)).toBe(true);
  });
});
