import {
  MAX_POSICOES,
  MIN_POSICOES_COMPUTAVEIS,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { validateExecucao } from "../lib/matcher-validation";

describe("validateExecucao", () => {
  describe("when there are enough computable positions", () => {
    it("is valid once the minimum of computable positions is met", () => {
      // Arrange
      const posicoes = Array.from(
        { length: MIN_POSICOES_COMPUTAVEIS },
        () => "aprovar" as const,
      );

      // Act
      const result = validateExecucao({
        totalSelecionadas: posicoes.length,
        posicoes,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.totalRespondidas).toBe(MIN_POSICOES_COMPUTAVEIS);
      expect(result.totalComputaveis).toBe(MIN_POSICOES_COMPUTAVEIS);
      expect(result.faltamRespostas).toBe(0);
      expect(result.faltamComputaveis).toBe(0);
    });
  });

  describe("when at least one selected proposicao has no position", () => {
    it("is invalid and reports how many responses are still missing", () => {
      // Arrange
      const posicoes = [
        "aprovar" as const,
        "rejeitar" as const,
        "aprovar" as const,
      ];

      // Act
      const result = validateExecucao({
        totalSelecionadas: 5,
        posicoes,
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.totalRespondidas).toBe(3);
      expect(result.faltamRespostas).toBe(2);
      expect(result.faltamComputaveis).toBe(0);
    });
  });

  describe("when there are too few computable positions", () => {
    it("is invalid and reports how many are still missing", () => {
      // Arrange
      const posicoes: ("aprovar" | "rejeitar")[] = ["aprovar"];

      // Act
      const result = validateExecucao({ totalSelecionadas: 1, posicoes });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.faltamComputaveis).toBe(MIN_POSICOES_COMPUTAVEIS - 1);
    });
  });

  describe('when positions are declared as "nao_sei"', () => {
    it("does not count them toward the computable total", () => {
      // Arrange
      const posicoes = [
        "aprovar" as const,
        "rejeitar" as const,
        "nao_sei" as const,
        "nao_sei" as const,
      ];

      // Act
      const result = validateExecucao({ totalSelecionadas: 4, posicoes });

      // Assert
      expect(result.totalComputaveis).toBe(2);
      expect(result.valid).toBe(false);
    });
  });

  describe("when more than the maximum proposicoes are selected", () => {
    it("flags the excess and is invalid even with enough computable positions", () => {
      // Arrange
      const posicoes = Array.from(
        { length: MAX_POSICOES + 1 },
        () => "aprovar" as const,
      );

      // Act
      const result = validateExecucao({
        totalSelecionadas: MAX_POSICOES + 1,
        posicoes,
      });

      // Assert
      expect(result.excedeMax).toBe(true);
      expect(result.valid).toBe(false);
    });
  });
});
