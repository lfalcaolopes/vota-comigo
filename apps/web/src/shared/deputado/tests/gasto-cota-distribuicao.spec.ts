import { describe, expect, it } from "vitest";

import { deriveGastoCotaDistribuicao } from "../gasto-cota-distribuicao";

describe("distribuição anual dos gastos da cota", () => {
  describe("quando há gasto em uma única categoria", () => {
    it("preserva a categoria oficial como a única série", () => {
      // Arrange
      const categories = [
        {
          externalNumSubCota: 3,
          description: "Combustíveis e lubrificantes",
          amountUsedCents: 125_000,
        },
      ];

      // Act
      const distribuicao = deriveGastoCotaDistribuicao(categories);

      // Assert
      expect(distribuicao).toEqual([
        {
          externalNumSubCota: 3,
          description: "Combustíveis e lubrificantes",
          amountUsedCents: 125_000,
        },
      ]);
    });
  });

  describe("quando há gasto em menos de cinco categorias", () => {
    it("não cria grupos vazios para completar o limite", () => {
      // Arrange
      const categories = [
        {
          externalNumSubCota: 3,
          description: "Categoria 3",
          amountUsedCents: 30_000,
        },
        {
          externalNumSubCota: 5,
          description: "Categoria 5",
          amountUsedCents: 20_000,
        },
        {
          externalNumSubCota: 1,
          description: "Categoria 1",
          amountUsedCents: 10_000,
        },
      ];

      // Act
      const distribuicao = deriveGastoCotaDistribuicao(categories);

      // Assert
      expect(distribuicao).toHaveLength(3);
      expect(distribuicao.map((serie) => serie.externalNumSubCota)).toEqual([
        3, 5, 1,
      ]);
    });
  });

  describe("quando há gasto em mais de cinco categorias", () => {
    it("mantém as cinco maiores e soma as demais em Outras despesas", () => {
      // Arrange
      const categories = [
        {
          externalNumSubCota: 1,
          description: "Categoria 1",
          amountUsedCents: 90_000,
        },
        {
          externalNumSubCota: 2,
          description: "Categoria 2",
          amountUsedCents: 80_000,
        },
        {
          externalNumSubCota: 3,
          description: "Categoria 3",
          amountUsedCents: 70_000,
        },
        {
          externalNumSubCota: 4,
          description: "Categoria 4",
          amountUsedCents: 60_000,
        },
        {
          externalNumSubCota: 5,
          description: "Categoria 5",
          amountUsedCents: 50_000,
        },
        {
          externalNumSubCota: 6,
          description: "Categoria 6",
          amountUsedCents: 4_000,
        },
        {
          externalNumSubCota: 7,
          description: "Categoria 7",
          amountUsedCents: 300,
        },
      ];

      // Act
      const distribuicao = deriveGastoCotaDistribuicao(categories);

      // Assert
      expect(
        distribuicao.map(({ externalNumSubCota, amountUsedCents }) => [
          externalNumSubCota,
          amountUsedCents,
        ]),
      ).toEqual([
        [1, 90_000],
        [2, 80_000],
        [3, 70_000],
        [4, 60_000],
        [5, 50_000],
        [null, 4_300],
      ]);
      expect(distribuicao.at(-1)?.description).toBe("Outras despesas");
      expect(distribuicao.at(-1)?.groupedCategories).toEqual([
        {
          externalNumSubCota: 6,
          description: "Categoria 6",
          amountUsedCents: 4_000,
        },
        {
          externalNumSubCota: 7,
          description: "Categoria 7",
          amountUsedCents: 300,
        },
      ]);
    });
  });

  describe("quando categorias empatam no total anual", () => {
    it("desempata pelo código para manter o corte determinístico", () => {
      // Arrange
      const categories = [9, 2, 7, 4, 11, 3].map((externalNumSubCota) => ({
        externalNumSubCota,
        description: `Categoria ${externalNumSubCota}`,
        amountUsedCents: 1_000,
      }));

      // Act
      const distribuicao = deriveGastoCotaDistribuicao(categories);

      // Assert
      expect(distribuicao.map((serie) => serie.externalNumSubCota)).toEqual([
        2,
        3,
        4,
        7,
        9,
        null,
      ]);
    });
  });
});
