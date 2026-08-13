import type {
  DeputadoCeapCategory,
  DeputadoCeapMonth,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { deriveGastoCotaDistribuicaoMensal } from "../gasto-cota-distribuicao-mensal";

describe("distribuição mensal dos gastos da cota", () => {
  describe("quando o ano tem registros em poucos meses", () => {
    it("mantém os doze meses em ordem e as séries da distribuição anual", () => {
      // Arrange
      const categories: DeputadoCeapCategory[] = [
        {
          externalNumSubCota: 3,
          description: "Combustíveis e lubrificantes",
          amountUsedCents: 30_000,
        },
        {
          externalNumSubCota: 5,
          description: "Passagens aéreas",
          amountUsedCents: 20_000,
        },
      ];
      const months = createMonths(12);

      // Act
      const distribuicao = deriveGastoCotaDistribuicaoMensal(
        categories,
        months,
      );

      // Assert
      expect(distribuicao.months.map((item) => item.month)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);
      expect(
        distribuicao.series.map((serie) => serie.externalNumSubCota),
      ).toEqual([3, 5]);
    });

    it("projeta zero nas cinco categorias ausentes e agrega o gasto restante", () => {
      // Arrange
      const categories = [1, 2, 3, 4, 5, 6].map(
        (externalNumSubCota): DeputadoCeapCategory => ({
          externalNumSubCota,
          description: `Categoria ${externalNumSubCota}`,
          amountUsedCents: 7_000 - externalNumSubCota * 1_000,
        }),
      );
      const months = createMonths(12);
      months[2] = {
        month: 3,
        totalAmountUsedCents: 400,
        categories: [{ externalNumSubCota: 6, amountUsedCents: 400 }],
      };

      // Act
      const distribuicao = deriveGastoCotaDistribuicaoMensal(
        categories,
        months,
      );

      // Assert
      expect(distribuicao.months[2]?.amountUsedCentsBySeries).toEqual([
        0, 0, 0, 0, 0, 400,
      ]);
    });
  });

  describe("quando a cobertura termina antes de dezembro", () => {
    it("distingue mês zerado de lacuna e exclui a lacuna do total", () => {
      // Arrange
      const categories: DeputadoCeapCategory[] = [
        {
          externalNumSubCota: 3,
          description: "Combustíveis e lubrificantes",
          amountUsedCents: 10_000,
        },
      ];
      const months = createMonths(2);
      months[0] = {
        month: 1,
        totalAmountUsedCents: 10_000,
        categories: [{ externalNumSubCota: 3, amountUsedCents: 10_000 }],
      };

      // Act
      const distribuicao = deriveGastoCotaDistribuicaoMensal(
        categories,
        months,
      );

      // Assert
      expect(distribuicao.months[1]?.amountUsedCentsBySeries).toEqual([0]);
      expect(distribuicao.months[2]?.amountUsedCentsBySeries).toBeNull();
      expect(distribuicao.totalAmountUsedCents).toBe(10_000);
    });
  });

  describe("quando há compensação em um mês", () => {
    it("preserva o valor negativo na série mensal", () => {
      // Arrange
      const categories: DeputadoCeapCategory[] = [
        {
          externalNumSubCota: 5,
          description: "Passagens aéreas",
          amountUsedCents: 600,
        },
      ];
      const months = createMonths(12);
      months[0] = {
        month: 1,
        totalAmountUsedCents: -400,
        categories: [{ externalNumSubCota: 5, amountUsedCents: -400 }],
      };
      months[1] = {
        month: 2,
        totalAmountUsedCents: 1_000,
        categories: [{ externalNumSubCota: 5, amountUsedCents: 1_000 }],
      };

      // Act
      const distribuicao = deriveGastoCotaDistribuicaoMensal(
        categories,
        months,
      );

      // Assert
      expect(distribuicao.months[0]?.amountUsedCentsBySeries).toEqual([-400]);
    });
  });
});

function createMonths(coveredThroughMonth: number): DeputadoCeapMonth[] {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    totalAmountUsedCents: index < coveredThroughMonth ? 0 : null,
    categories: [],
  }));
}
