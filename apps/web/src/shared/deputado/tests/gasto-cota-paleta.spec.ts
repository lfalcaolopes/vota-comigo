import { describe, expect, it } from "vitest";

import {
  GASTO_COTA_COR_NEUTRA,
  applyGastoCotaPaleta,
  getGastoCotaCor,
} from "../gasto-cota-paleta";

describe("paleta dos gastos da cota", () => {
  describe("quando a categoria pertence à paleta medida", () => {
    it("atribui cor categórica exatamente aos oito códigos definidos", () => {
      // Arrange
      const codigosDaPaleta = [5, 3, 120, 1, 999, 998, 10, 4];

      // Act
      const coresDaPaleta = codigosDaPaleta.map(getGastoCotaCor);

      // Assert
      expect(new Set(coresDaPaleta)).toHaveLength(8);
      expect(coresDaPaleta).not.toContain(GASTO_COTA_COR_NEUTRA);
    });

    it("mantém a mesma cor entre anos e deputados", () => {
      // Arrange
      const codigoCompartilhado = 120;

      // Act
      const corNoPrimeiroPerfil = getGastoCotaCor(codigoCompartilhado);
      const corEmOutroAno = getGastoCotaCor(codigoCompartilhado);
      const corEmOutroPerfil = getGastoCotaCor(codigoCompartilhado);

      // Assert
      expect(corEmOutroAno).toBe(corNoPrimeiroPerfil);
      expect(corEmOutroPerfil).toBe(corNoPrimeiroPerfil);
    });
  });

  describe("quando a distribuição inclui Outras despesas", () => {
    it("preserva a ordem das séries e atribui a cor neutra ao agrupamento", () => {
      // Arrange
      const series = [
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
          externalNumSubCota: null,
          description: "Outras despesas",
          amountUsedCents: 10_000,
        },
      ];

      // Act
      const coloredSeries = applyGastoCotaPaleta(series);

      // Assert
      expect(coloredSeries.map((serie) => serie.externalNumSubCota)).toEqual([
        3,
        5,
        null,
      ]);
      expect(coloredSeries.at(-1)?.color).toBe(GASTO_COTA_COR_NEUTRA);
    });
  });

  describe("quando uma categoria está fora da paleta principal", () => {
    it("atribui uma cor secundária diferente de Outras despesas", () => {
      // Arrange
      const codigoCategoriaSecundaria = 42;

      // Act
      const corCategoriaSecundaria = getGastoCotaCor(codigoCategoriaSecundaria);
      const corOutrasDespesas = getGastoCotaCor(null);

      // Assert
      expect(corCategoriaSecundaria).not.toBe(corOutrasDespesas);
      expect(corOutrasDespesas).toBe(GASTO_COTA_COR_NEUTRA);
    });

    it("mantém sua cor entre anos e deputados", () => {
      // Arrange
      const codigoCategoriaSecundaria = 42;

      // Act
      const corNoPrimeiroPerfil = getGastoCotaCor(codigoCategoriaSecundaria);
      const corEmOutroAno = getGastoCotaCor(codigoCategoriaSecundaria);
      const corEmOutroPerfil = getGastoCotaCor(codigoCategoriaSecundaria);

      // Assert
      expect(corEmOutroAno).toBe(corNoPrimeiroPerfil);
      expect(corEmOutroPerfil).toBe(corNoPrimeiroPerfil);
    });

    it("distingue duas categorias secundárias no mesmo gráfico", () => {
      // Arrange
      const primeiroCodigo = 2;
      const segundoCodigo = 17;

      // Act
      const primeiraCor = getGastoCotaCor(primeiroCodigo);
      const segundaCor = getGastoCotaCor(segundoCodigo);

      // Assert
      expect(primeiraCor).not.toBe(segundaCor);
    });
  });
});
