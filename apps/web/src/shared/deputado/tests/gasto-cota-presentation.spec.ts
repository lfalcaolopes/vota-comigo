import { describe, expect, it } from "vitest";

import { formatGastoCotaCompacto } from "../gasto-cota-presentation";

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
