import { describe, expect, it } from "vitest";

import { deriveGastoCotaRevealTimeline } from "../gasto-cota-reveal";

describe("cronograma de revelacao das barras de cota", () => {
  describe("duracao proporcional ao tamanho da rubrica", () => {
    it("da a duracao cheia para a maior rubrica", () => {
      // Arrange
      const amounts = [100, 50, 10];

      // Act
      const timeline = deriveGastoCotaRevealTimeline(amounts);

      // Assert
      expect(timeline.steps[0].durationMs).toBe(3000);
    });

    it("encurta as rubricas menores na proporcao do valor", () => {
      // Arrange
      const amounts = [100, 50, 10];

      // Act
      const timeline = deriveGastoCotaRevealTimeline(amounts);

      // Assert
      expect(timeline.steps[1].durationMs).toBe(2100);
      expect(timeline.steps[2].durationMs).toBe(1380);
    });

    it("segura a rubrica minuscula no piso, para nao virar um frame so", () => {
      // Arrange
      const amounts = [1_000_000, 1];

      // Act
      const timeline = deriveGastoCotaRevealTimeline(amounts);

      // Assert
      expect(timeline.steps[1].durationMs).toBe(1200);
    });
  });

  describe("escalonamento entre as barras", () => {
    it("adia cada barra na ordem em que a rubrica chega", () => {
      // Arrange
      const amounts = [100, 50, 10];

      // Act
      const timeline = deriveGastoCotaRevealTimeline(amounts);

      // Assert
      expect(timeline.steps.map((step) => step.delayMs)).toEqual([0, 120, 240]);
    });
  });

  describe("sincronia com a contagem do total", () => {
    it("fecha o cronograma quando a ultima barra para de crescer", () => {
      // Arrange
      const amounts = [100, 50, 10];

      // Act
      const timeline = deriveGastoCotaRevealTimeline(amounts);

      // Assert
      expect(timeline.totalDurationMs).toBe(3000);
    });

    it("conta o escalonamento quando a barra mais lenta nao e a primeira", () => {
      // Arrange
      const amounts = [10, 100];

      // Act
      const timeline = deriveGastoCotaRevealTimeline(amounts);

      // Assert
      expect(timeline.totalDurationMs).toBe(3120);
    });
  });

  describe("entradas degeneradas", () => {
    it("nao produz cronograma sem rubricas", () => {
      // Arrange / Act
      const timeline = deriveGastoCotaRevealTimeline([]);

      // Assert
      expect(timeline.steps).toEqual([]);
      expect(timeline.totalDurationMs).toBe(0);
    });

    it("mantem o piso quando nenhuma rubrica tem valor", () => {
      // Arrange / Act
      const timeline = deriveGastoCotaRevealTimeline([0, 0]);

      // Assert
      expect(timeline.steps.map((step) => step.durationMs)).toEqual([
        1200, 1200,
      ]);
      expect(timeline.totalDurationMs).toBe(1320);
    });
  });
});
