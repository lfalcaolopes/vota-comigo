import { describe, expect, it } from "vitest";

import {
  describeProjecaoHistory,
  findLiderContrario,
  findStableFrom,
} from "../lib/projecao-history";

const snapshots = [
  {
    urnasApuradas: 9.1,
    oficialShareA: 0.505,
    projecaoShareA: 0.518,
    tseUpdatedAt: "25/10/2026 19:36:39",
  },
  {
    urnasApuradas: 15.4,
    oficialShareA: 0.499,
    projecaoShareA: 0.515,
    tseUpdatedAt: "25/10/2026 19:47:59",
  },
  {
    urnasApuradas: 45.4,
    oficialShareA: 0.4995,
    projecaoShareA: 0.521,
    tseUpdatedAt: "25/10/2026 20:22:49",
  },
  {
    urnasApuradas: 80.8,
    oficialShareA: 0.514,
    projecaoShareA: 0.517,
    tseUpdatedAt: "25/10/2026 20:53:21",
  },
  {
    urnasApuradas: 95.3,
    oficialShareA: 0.517,
    projecaoShareA: 0.5173,
    tseUpdatedAt: "25/10/2026 21:06:51",
  },
];

const finalShareA = 0.5177;

describe("histórico da projeção", () => {
  describe("a partir de quando a série ficou perto do resultado final", () => {
    it("aponta a primeira parcial depois da qual a série não sai mais da tolerância", () => {
      // Act
      const urnas = findStableFrom(
        snapshots,
        "oficialShareA",
        finalShareA,
        0.005,
      );

      // Assert
      expect(urnas).toBe(80.8);
    });

    it("ignora uma aproximação que não se manteve", () => {
      // Arrange
      const oscilante = [
        { ...snapshots[0], oficialShareA: 0.517 },
        ...snapshots.slice(1),
      ];

      // Act
      const urnas = findStableFrom(
        oscilante,
        "oficialShareA",
        finalShareA,
        0.005,
      );

      // Assert
      expect(urnas).toBe(80.8);
    });

    it("aponta a primeira parcial quando a série nunca saiu da tolerância", () => {
      // Act
      const urnas = findStableFrom(
        snapshots,
        "projecaoShareA",
        finalShareA,
        0.005,
      );

      // Assert
      expect(urnas).toBe(9.1);
    });

    it("não aponta parcial quando a última ainda estava fora da tolerância", () => {
      // Act
      const urnas = findStableFrom(
        snapshots,
        "oficialShareA",
        finalShareA,
        0.0001,
      );

      // Assert
      expect(urnas).toBeNull();
    });
  });

  describe("quando a série apontou o perdedor à frente", () => {
    it("devolve a primeira e a última parcial com o líder trocado", () => {
      // Act
      const intervalo = findLiderContrario(
        snapshots,
        "oficialShareA",
        finalShareA,
      );

      // Assert
      expect(intervalo).toEqual({ from: 15.4, to: 45.4 });
    });

    it("não devolve intervalo quando o vencedor esteve sempre à frente", () => {
      // Act
      const intervalo = findLiderContrario(
        snapshots,
        "projecaoShareA",
        finalShareA,
      );

      // Assert
      expect(intervalo).toBeNull();
    });
  });

  describe("frases do destaque", () => {
    it("compara quando cada série chegou perto do resultado e quando a parcial trocou o líder", () => {
      // Act
      const frases = describeProjecaoHistory(
        snapshots,
        finalShareA,
        0.005,
        "Lula",
        "Flavio Bolsonaro",
      );

      // Assert
      expect(frases).toEqual({
        projecao:
          "A projeção ficou a menos de 0,5 ponto do resultado final desde a primeira parcial gravada, com 9% das urnas.",
        oficial:
          "A parcial oficial só chegou a essa distância com 81% das urnas, e entre 15% e 45% das urnas mostrava Flavio Bolsonaro à frente.",
      });
    });

    it("não fala em troca de líder quando a parcial sempre mostrou o vencedor à frente", () => {
      // Arrange
      const semTroca = snapshots.map((snapshot) => ({
        ...snapshot,
        oficialShareA: Math.max(snapshot.oficialShareA, 0.505),
      }));

      // Act
      const { oficial } = describeProjecaoHistory(
        semTroca,
        finalShareA,
        0.005,
        "Lula",
        "Flavio Bolsonaro",
      );

      // Assert
      expect(oficial).toBe(
        "A parcial oficial só chegou a essa distância com 81% das urnas.",
      );
    });
  });
});
