import { describe, expect, it } from "vitest";

import {
  gastoCotaSelecaoInicial,
  getGastoCotaIndiceAtivo,
  reduceGastoCotaSelecao,
} from "../gasto-cota-selecao";

describe("seleção de categoria na distribuição anual", () => {
  describe("quando o ponteiro ou o foco passa por uma categoria", () => {
    it("mostra uma prévia e a remove ao sair", () => {
      // Arrange
      const initialState = gastoCotaSelecaoInicial;

      // Act
      const previewState = reduceGastoCotaSelecao(initialState, {
        type: "preview",
        index: 2,
      });
      const finalState = reduceGastoCotaSelecao(previewState, {
        type: "clear-preview",
      });

      // Assert
      expect(getGastoCotaIndiceAtivo(previewState)).toBe(2);
      expect(getGastoCotaIndiceAtivo(finalState)).toBeNull();
    });
  });

  describe("quando uma categoria é fixada", () => {
    it("restaura a categoria fixada depois de uma prévia em outra", () => {
      // Arrange
      const pinnedState = reduceGastoCotaSelecao(gastoCotaSelecaoInicial, {
        type: "pin",
        index: 1,
      });

      // Act
      const previewState = reduceGastoCotaSelecao(pinnedState, {
        type: "preview",
        index: 3,
      });
      const finalState = reduceGastoCotaSelecao(previewState, {
        type: "clear-preview",
      });

      // Assert
      expect(getGastoCotaIndiceAtivo(previewState)).toBe(3);
      expect(getGastoCotaIndiceAtivo(finalState)).toBe(1);
    });

    it("limpa a seleção ao acionar a categoria fixada novamente", () => {
      // Arrange
      const pinnedState = reduceGastoCotaSelecao(gastoCotaSelecaoInicial, {
        type: "pin",
        index: 1,
      });

      // Act
      const finalState = reduceGastoCotaSelecao(pinnedState, {
        type: "pin",
        index: 1,
      });

      // Assert
      expect(getGastoCotaIndiceAtivo(finalState)).toBeNull();
    });
  });
});
