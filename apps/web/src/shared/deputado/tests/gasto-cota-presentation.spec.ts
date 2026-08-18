import { describe, expect, it } from "vitest";

import {
  formatGastoCotaCompacto,
  formatGastoCotaCompactoDistinto,
} from "../gasto-cota-presentation";

describe("valor compacto do gasto da cota", () => {
  describe("quando o valor cabe em milhares ou milhões", () => {
    it("abrevia a grandeza sem centavos", () => {
      // Arrange / Act / Assert
      expect(formatGastoCotaCompacto(55_200_000)).toBe("R$ 552 mil");
      expect(formatGastoCotaCompacto(110_000_000)).toBe("R$ 1,1 mi");
    });
  });

  describe("quando o agregado é negativo", () => {
    it("preserva o sinal em vez de exibir despesa positiva", () => {
      // Arrange / Act
      const label = formatGastoCotaCompacto(-450_000);

      // Assert
      expect(label).toBe("-R$ 4,5 mil");
    });
  });
});

describe("par compacto de valores próximos", () => {
  describe("quando a abreviação colapsaria valores diferentes", () => {
    it("abre casas decimais até que a diferença apareça", () => {
      // Arrange / Act
      const [gasto, teto] = formatGastoCotaCompactoDistinto([
        198_432_000, 200_150_000,
      ]);

      // Assert
      expect([gasto, teto]).toEqual(["R$ 1,98 mi", "R$ 2,00 mi"]);
    });
  });

  describe("quando a abreviação já separa os valores", () => {
    it("mantém a forma mais curta", () => {
      // Arrange / Act
      const par = formatGastoCotaCompactoDistinto([110_000_000, 140_000_000]);

      // Assert
      expect(par).toEqual(["R$ 1,1 mi", "R$ 1,4 mi"]);
    });
  });

  describe("quando os valores realmente coincidem", () => {
    it("não força decimais para inventar uma diferença", () => {
      // Arrange / Act
      const par = formatGastoCotaCompactoDistinto([140_000_000, 140_000_000]);

      // Assert
      expect(par).toEqual(["R$ 1,4 mi", "R$ 1,4 mi"]);
    });
  });
});
