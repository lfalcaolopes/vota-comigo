import { describe, expect, it } from "vitest";

import {
  gastoCotaSelecaoMensalInicial,
  getGastoCotaPontoMensalAtivo,
  reduceGastoCotaSelecaoMensal,
} from "../gasto-cota-selecao-mensal";

describe("seleção de um gasto mensal", () => {
  describe("quando um ponto foi fixado antes de uma prévia", () => {
    it("restaura mês e categoria fixados ao encerrar a prévia", () => {
      // Arrange
      const pinnedState = reduceGastoCotaSelecaoMensal(
        gastoCotaSelecaoMensalInicial,
        { type: "pin", point: { monthIndex: 2, seriesIndex: 1 } },
      );

      // Act
      const previewState = reduceGastoCotaSelecaoMensal(pinnedState, {
        type: "preview",
        point: { monthIndex: 6, seriesIndex: 3 },
      });
      const finalState = reduceGastoCotaSelecaoMensal(previewState, {
        type: "clear-preview",
      });

      // Assert
      expect(getGastoCotaPontoMensalAtivo(previewState)).toEqual({
        monthIndex: 6,
        seriesIndex: 3,
      });
      expect(getGastoCotaPontoMensalAtivo(finalState)).toEqual({
        monthIndex: 2,
        seriesIndex: 1,
      });
    });
  });

  describe("quando a prévia já está ativa no mesmo ponto", () => {
    it("preserva o estado para não redesenhar o segmento sob o ponteiro", () => {
      // Arrange
      const previewState = reduceGastoCotaSelecaoMensal(
        gastoCotaSelecaoMensalInicial,
        { type: "preview", point: { monthIndex: 0, seriesIndex: 0 } },
      );

      // Act
      const repeatedState = reduceGastoCotaSelecaoMensal(previewState, {
        type: "preview",
        point: { monthIndex: 0, seriesIndex: 0 },
      });

      // Assert
      expect(repeatedState).toBe(previewState);
    });
  });
});
