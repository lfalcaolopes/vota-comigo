import { describe, expect, it } from "vitest";

import {
  buildDeputadosFeedHref,
  buildDeputadosFeedSearchParams,
  parseDeputadosFeedUrlState,
} from "../feed-url";

describe("parseDeputadosFeedUrlState", () => {
  describe("when deputado feed params are present", () => {
    it("parses query, activity, and UF", () => {
      // Arrange / Act
      const state = parseDeputadosFeedUrlState({
        q: " maria ",
        emAtividade: "true",
        uf: "sp",
      });

      // Assert
      expect(state).toEqual({
        query: "maria",
        emAtividade: true,
        uf: "SP",
      });
    });
  });

  describe("when deputado feed params are invalid", () => {
    it("drops invalid params", () => {
      // Arrange / Act
      const state = parseDeputadosFeedUrlState({
        q: " /// ",
        emAtividade: "sim",
        uf: "SPP",
      });

      // Assert
      expect(state).toEqual({
        query: null,
        emAtividade: false,
        uf: null,
      });
    });
  });
});

describe("buildDeputadosFeedSearchParams", () => {
  it("keeps active deputado feed criteria in the query string", () => {
    // Arrange / Act
    const params = buildDeputadosFeedSearchParams({
      query: "maria silva",
      emAtividade: true,
      uf: "SP",
    });

    // Assert
    expect(params.toString()).toBe(
      "q=maria+silva&emAtividade=true&uf=SP",
    );
  });
});

describe("buildDeputadosFeedHref", () => {
  it("appends deputado feed params to a pathname", () => {
    // Arrange / Act
    const href = buildDeputadosFeedHref("/deputados", {
      query: "maria",
      emAtividade: true,
      uf: "SP",
    });

    // Assert
    expect(href).toBe("/deputados?q=maria&emAtividade=true&uf=SP");
  });
});
