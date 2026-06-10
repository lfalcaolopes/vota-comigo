import type { PosicaoUsuarioMatcher } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { buildExecucaoRequest } from "../lib/matcher-payload";

function posicoesMap(
  entries: [number, PosicaoUsuarioMatcher][],
): Map<number, PosicaoUsuarioMatcher> {
  return new Map(entries);
}

describe("buildExecucaoRequest", () => {
  describe("when positions mix computable and nao_sei", () => {
    it("includes only the computable positions and omits nao_sei", () => {
      // Arrange
      const input = {
        siglaUf: "SP" as const,
        escopo: "estadual" as const,
        posicoes: posicoesMap([
          [1, "aprovar"],
          [2, "nao_sei"],
          [3, "rejeitar"],
        ]),
      };

      // Act
      const request = buildExecucaoRequest(input);

      // Assert
      expect(request.siglaUf).toBe("SP");
      expect(request.escopo).toBe("estadual");
      expect(request.posicoes).toEqual([
        { externalIdProposicao: 1, posicao: "aprovar" },
        { externalIdProposicao: 3, posicao: "rejeitar" },
      ]);
    });
  });

  describe("when a cidade is informed", () => {
    it("attaches the trimmed cidade to the request", () => {
      // Arrange
      const input = {
        siglaUf: "RJ" as const,
        escopo: "estadual" as const,
        cidade: "  Niterói  ",
        posicoes: posicoesMap([[1, "aprovar"]]),
      };

      // Act
      const request = buildExecucaoRequest(input);

      // Assert
      expect(request.cidade).toBe("Niterói");
    });

    it("includes a cidade of exactly 120 characters", () => {
      // Arrange
      const cidadeMax = "A".repeat(120);
      const input = {
        siglaUf: "SP" as const,
        escopo: "estadual" as const,
        cidade: cidadeMax,
        posicoes: posicoesMap([[1, "aprovar"]]),
      };

      // Act
      const request = buildExecucaoRequest(input);

      // Assert
      expect(request.cidade).toBe(cidadeMax);
      expect(request.cidade!.length).toBe(120);
    });
  });

  describe("when no cidade is informed", () => {
    it("omits the cidade field entirely", () => {
      // Arrange
      const input = {
        siglaUf: "RJ" as const,
        escopo: "nacional" as const,
        cidade: "   ",
        posicoes: posicoesMap([[1, "aprovar"]]),
      };

      // Act
      const request = buildExecucaoRequest(input);

      // Assert
      expect(request).not.toHaveProperty("cidade");
    });
  });
});
