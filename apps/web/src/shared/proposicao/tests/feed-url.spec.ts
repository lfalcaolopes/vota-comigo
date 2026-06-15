import { describe, expect, it } from "vitest";

import {
  buildFeedHref,
  buildFeedSearchParams,
  parseFeedUrlState,
} from "../feed-url";

describe("parseFeedUrlState", () => {
  describe("when feed params are present", () => {
    it("parses query, ordenacao, and tema", () => {
      // Arrange / Act
      const state = parseFeedUrlState({
        ordenacao: "mais-recentes",
        q: " saúde pública ",
        tema: "37",
      });

      // Assert
      expect(state).toEqual({
        ordenacao: "mais-recentes",
        query: "saúde pública",
        tema: 37,
      });
    });
  });

  describe("when feed params are invalid", () => {
    it("falls back to the default feed state", () => {
      // Arrange / Act
      const state = parseFeedUrlState({
        ordenacao: "recentes",
        q: " /// ",
        tema: "-1",
      });

      // Assert
      expect(state).toEqual({
        ordenacao: "mais-votadas",
        query: null,
        tema: null,
      });
    });
  });
});

describe("buildFeedSearchParams", () => {
  it("keeps non-default feed criteria in the query string", () => {
    // Arrange / Act
    const params = buildFeedSearchParams({
      ordenacao: "mais-recentes",
      query: "saúde pública",
      tema: 37,
    });

    // Assert
    expect(params.toString()).toBe(
      "q=sa%C3%BAde+p%C3%BAblica&ordenacao=mais-recentes&tema=37",
    );
  });

  it("omits empty query and default ordenacao", () => {
    // Arrange / Act
    const params = buildFeedSearchParams({
      ordenacao: "mais-votadas",
      query: " ",
      tema: null,
    });

    // Assert
    expect(params.toString()).toBe("");
  });
});

describe("buildFeedHref", () => {
  it("appends feed params to a pathname", () => {
    // Arrange / Act
    const href = buildFeedHref("/proposicoes/42", {
      ordenacao: "mais-recentes",
      query: "saúde",
      tema: 37,
    });

    // Assert
    expect(href).toBe(
      "/proposicoes/42?q=sa%C3%BAde&ordenacao=mais-recentes&tema=37",
    );
  });

  it("returns the pathname when there are no params", () => {
    // Arrange / Act
    const href = buildFeedHref("/", {
      ordenacao: "mais-votadas",
      query: null,
      tema: null,
    });

    // Assert
    expect(href).toBe("/");
  });
});
