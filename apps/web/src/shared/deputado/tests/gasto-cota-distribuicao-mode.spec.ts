import { describe, expect, it } from "vitest";

import { deriveGastoCotaDistribuicaoMode } from "../gasto-cota-distribuicao-mode";

describe("modo da distribuição anual dos gastos da cota", () => {
  describe("quando os grupos são não negativos e o total é positivo", () => {
    it("usa a rosca", () => {
      // Arrange
      const series = [
        {
          externalNumSubCota: 3,
          description: "Combustíveis e lubrificantes",
          amountUsedCents: 125_000,
        },
      ];

      // Act
      const mode = deriveGastoCotaDistribuicaoMode(series, 125_000);

      // Assert
      expect(mode).toBe("rosca");
    });
  });

  describe("quando um grupo de apresentação é negativo", () => {
    it("usa barras para o caso real do deputado 204556 em 2023", () => {
      // Arrange
      const series = [
        {
          externalNumSubCota: 119,
          description: "LOCAÇÃO OU FRETAMENTO DE AERONAVES",
          amountUsedCents: 2_079_030,
        },
        {
          externalNumSubCota: 120,
          description: "LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES",
          amountUsedCents: 1_178_240,
        },
        {
          externalNumSubCota: 9,
          description: "PASSAGEM AÉREA - REEMBOLSO",
          amountUsedCents: 929_563,
        },
        {
          externalNumSubCota: 5,
          description: "DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.",
          amountUsedCents: 170_000,
        },
        {
          externalNumSubCota: 10,
          description: "TELEFONIA",
          amountUsedCents: 178,
        },
        {
          externalNumSubCota: null,
          description: "Outras despesas",
          amountUsedCents: -1_328_898,
        },
      ];

      // Act
      const mode = deriveGastoCotaDistribuicaoMode(series, 3_028_113);

      // Assert
      expect(mode).toBe("barras");
    });
  });

  describe("quando o total anual é negativo", () => {
    it("usa barras mesmo que os grupos não sejam negativos", () => {
      // Arrange
      const series = [
        {
          externalNumSubCota: 5,
          description: "Divulgação da atividade parlamentar",
          amountUsedCents: 100,
        },
      ];

      // Act
      const mode = deriveGastoCotaDistribuicaoMode(series, -1);

      // Assert
      expect(mode).toBe("barras");
    });
  });

  describe("quando o total anual é zero", () => {
    it("usa barras no limite entre total positivo e negativo", () => {
      // Arrange
      const series = [
        {
          externalNumSubCota: 5,
          description: "Divulgação da atividade parlamentar",
          amountUsedCents: 100,
        },
      ];

      // Act
      const mode = deriveGastoCotaDistribuicaoMode(series, 0);

      // Assert
      expect(mode).toBe("barras");
    });
  });

  describe("quando há grupo negativo e total não positivo", () => {
    it("mantém o modo barras quando os dois gatilhos coexistem", () => {
      // Arrange
      const series = [
        {
          externalNumSubCota: 999,
          description: "Passagem aérea - RPA",
          amountUsedCents: -100,
        },
      ];

      // Act
      const mode = deriveGastoCotaDistribuicaoMode(series, -100);

      // Assert
      expect(mode).toBe("barras");
    });
  });
});
