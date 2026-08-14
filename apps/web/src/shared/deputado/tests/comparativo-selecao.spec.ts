import { describe, expect, it } from "vitest";

import {
  buildComparativoDeputadosHref,
  canOpenComparativo,
  hasComparativoDeputadoLimit,
  parseComparativoDeputadosIds,
  toggleComparativoDeputado,
} from "../comparativo-selecao";

function deputado(externalIdDeputado: number) {
  return { externalIdDeputado };
}

describe("seleção de deputados para o comparativo", () => {
  describe("quando o usuário marca deputados", () => {
    it("acrescenta um deputado ainda não selecionado", () => {
      // Arrange
      const selecionados = [deputado(1)];

      // Act
      const result = toggleComparativoDeputado(selecionados, deputado(2));

      // Assert
      expect(result).toEqual([deputado(1), deputado(2)]);
    });

    it("desmarca um deputado já selecionado", () => {
      // Arrange
      const selecionados = [deputado(1), deputado(2)];

      // Act
      const result = toggleComparativoDeputado(selecionados, deputado(1));

      // Assert
      expect(result).toEqual([deputado(2)]);
    });

    it("ignora a marcação além do limite de três", () => {
      // Arrange
      const selecionados = [deputado(1), deputado(2), deputado(3)];

      // Act
      const result = toggleComparativoDeputado(selecionados, deputado(4));

      // Assert
      expect(result).toBe(selecionados);
    });

    it("não muta a lista recebida", () => {
      // Arrange
      const selecionados = [deputado(1)];

      // Act
      toggleComparativoDeputado(selecionados, deputado(2));

      // Assert
      expect(selecionados).toEqual([deputado(1)]);
    });
  });

  describe("quando o comparativo pode ser aberto", () => {
    it("exige ao menos dois deputados", () => {
      // Arrange
      const selecionados = [deputado(1)];

      // Act
      const result = canOpenComparativo(selecionados);

      // Assert
      expect(result).toBe(false);
    });

    it("aceita dois ou três deputados", () => {
      // Arrange
      const selecionados = [deputado(1), deputado(2), deputado(3)];

      // Act
      const result = canOpenComparativo(selecionados);

      // Assert
      expect(result).toBe(true);
    });

    it("avisa quando o limite foi atingido", () => {
      // Arrange
      const selecionados = [deputado(1), deputado(2), deputado(3)];

      // Act
      const result = hasComparativoDeputadoLimit(selecionados);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("quando o endereço carrega os deputados comparados", () => {
    it("lê os ids do segmento", () => {
      // Act
      const result = parseComparativoDeputadosIds("204554,220593");

      // Assert
      expect(result).toEqual([204554, 220593]);
    });

    it("lê os ids de um segmento codificado", () => {
      // Act
      const result = parseComparativoDeputadosIds("204554%2C220593");

      // Assert
      expect(result).toEqual([204554, 220593]);
    });

    it("recusa um único deputado", () => {
      // Act
      const result = parseComparativoDeputadosIds("204554");

      // Assert
      expect(result).toBeNull();
    });

    it("recusa ids repetidos", () => {
      // Act
      const result = parseComparativoDeputadosIds("204554,204554");

      // Assert
      expect(result).toBeNull();
    });

    it("recusa um id não numérico", () => {
      // Act
      const result = parseComparativoDeputadosIds("204554,abc");

      // Assert
      expect(result).toBeNull();
    });

    it("monta o endereço da comparação a partir da listagem", () => {
      // Act
      const result = buildComparativoDeputadosHref([204554, 220593]);

      // Assert
      expect(result).toBe("/deputados/comparativo/204554,220593");
    });
  });
});
