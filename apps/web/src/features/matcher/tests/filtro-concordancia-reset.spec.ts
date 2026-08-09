import type { PosicaoUsuarioMatcher } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { shouldClearFiltroConcordancia } from "../lib/filtro-concordancia-reset";

function input(externalIdProposicoes: number[]) {
  return {
    selected: externalIdProposicoes.map((externalIdProposicao) => ({
      externalIdProposicao,
    })),
    posicoes: new Map<number, PosicaoUsuarioMatcher>(
      externalIdProposicoes.map((externalIdProposicao) => [
        externalIdProposicao,
        "aprovar",
      ]),
    ),
  };
}

describe("Filtro de concordância do matcher", () => {
  describe("quando a seleção de proposições muda", () => {
    it("deve ser zerado ao adicionar uma proposição", () => {
      // Arrange
      const previous = input([1, 2, 3]);
      const next = input([1, 2, 3, 4]);

      // Act
      const shouldClear = shouldClearFiltroConcordancia(previous, next);

      // Assert
      expect(shouldClear).toBe(true);
    });

    it("deve ser zerado ao remover uma proposição", () => {
      // Arrange
      const previous = input([1, 2, 3]);
      const next = input([1, 2]);

      // Act
      const shouldClear = shouldClearFiltroConcordancia(previous, next);

      // Assert
      expect(shouldClear).toBe(true);
    });
  });

  describe("quando uma posição do usuário muda", () => {
    it("deve ser zerado", () => {
      // Arrange
      const previous = input([1, 2, 3]);
      const next = input([1, 2, 3]);
      next.posicoes.set(2, "rejeitar");

      // Act
      const shouldClear = shouldClearFiltroConcordancia(previous, next);

      // Assert
      expect(shouldClear).toBe(true);
    });
  });

  describe("quando seleção e posições são repetidas", () => {
    it("deve ser preservado", () => {
      // Arrange
      const previous = input([1, 2, 3]);
      const next = input([1, 2, 3]);

      // Act
      const shouldClear = shouldClearFiltroConcordancia(previous, next);

      // Assert
      expect(shouldClear).toBe(false);
    });
  });
});
