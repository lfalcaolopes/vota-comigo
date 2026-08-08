import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  getFurthestMatcherRoute,
  resolveMatcherRoute,
  stepStatus,
} from "../lib/matcher-route";
import type { MatcherRascunho } from "../lib/matcher-rascunho";

function emptyRascunho(): MatcherRascunho {
  return {
    siglaUf: null,
    cidade: "",
    escopo: "estadual",
    selected: [],
    posicoes: new Map(),
  };
}

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

describe("matcher route", () => {
  describe("when showing the step indicator", () => {
    it("marks earlier, current and later routes from the current address", () => {
      // Arrange / Act / Assert
      expect(stepStatus("/matcher/posicoes", "/matcher/local")).toBe("done");
      expect(stepStatus("/matcher/posicoes", "/matcher/posicoes")).toBe(
        "current",
      );
      expect(stepStatus("/matcher/posicoes", "/matcher/resultado")).toBe(
        "upcoming",
      );
    });
  });

  describe("when the user has informed a UF", () => {
    it("supports the proposicoes step", () => {
      // Arrange
      const rascunho = { ...emptyRascunho(), siglaUf: "SP" as const };

      // Act
      const route = getFurthestMatcherRoute(rascunho);

      // Assert
      expect(route).toBe("/matcher/proposicoes");
    });
  });

  describe("when the user has selected enough proposicoes", () => {
    it("supports the posicoes step", () => {
      // Arrange
      const rascunho = {
        ...emptyRascunho(),
        siglaUf: "SP" as const,
        selected: [card(1), card(2), card(3)],
      };

      // Act
      const route = getFurthestMatcherRoute(rascunho);

      // Assert
      expect(route).toBe("/matcher/posicoes");
    });
  });

  describe("when the rascunho is a valid matcher execution", () => {
    it("supports the resultado step", () => {
      // Arrange
      const rascunho = {
        ...emptyRascunho(),
        siglaUf: "SP" as const,
        selected: [card(1), card(2), card(3)],
        posicoes: new Map([
          [1, "aprovar" as const],
          [2, "rejeitar" as const],
          [3, "aprovar" as const],
        ]),
      };

      // Act
      const route = getFurthestMatcherRoute(rascunho);

      // Assert
      expect(route).toBe("/matcher/resultado");
    });
  });

  describe("when a deep route is opened with an empty rascunho", () => {
    it("redirects to the local step", () => {
      // Arrange
      const rascunho = emptyRascunho();

      // Act
      const destination = resolveMatcherRoute(
        "/matcher/resultado",
        rascunho,
      );

      // Assert
      expect(destination).toBe("/matcher/local");
    });
  });

  describe("when a route is ahead of the rascunho", () => {
    it("redirects to the furthest supported step", () => {
      // Arrange
      const rascunho = { ...emptyRascunho(), siglaUf: "SP" as const };

      // Act
      const destination = resolveMatcherRoute(
        "/matcher/resultado",
        rascunho,
      );

      // Assert
      expect(destination).toBe("/matcher/proposicoes");
    });
  });
});
