import { describe, expect, it } from "vitest";

import {
  deriveGastoCotaComparacaoEscala,
  formatGastoCotaComparacao,
  formatGastoCotaTeto,
} from "../gasto-cota-comparacao";

describe("escala da comparação anual da cota", () => {
  describe("quando o teto do ano é conhecido", () => {
    it("faz do teto o fim da escala", () => {
      // Arrange
      const total = 13855569;
      const mediana = 26904727;
      const teto = 58472952;

      // Act
      const escala = deriveGastoCotaComparacaoEscala(total, mediana, teto);

      // Assert
      expect(escala).toEqual({ domain: [0, teto], tetoExcedido: false });
    });

    it("mantém o teto como fim quando o total o alcança exatamente", () => {
      // Arrange
      const teto = 58472952;

      // Act
      const escala = deriveGastoCotaComparacaoEscala(teto, null, teto);

      // Assert
      expect(escala).toEqual({ domain: [0, teto], tetoExcedido: false });
    });

    it("estende a escala quando o total ultrapassa o teto", () => {
      // Arrange
      const teto = 58472952;
      const total = teto + 1000000;

      // Act
      const escala = deriveGastoCotaComparacaoEscala(total, null, teto);

      // Assert
      expect(escala.tetoExcedido).toBe(true);
      expect(escala.domain[1]).toBeGreaterThan(total);
    });

    it("abre espaço abaixo de zero para estornos", () => {
      // Arrange
      const teto = 58472952;

      // Act
      const escala = deriveGastoCotaComparacaoEscala(-50000, null, teto);

      // Assert
      expect(escala.domain[0]).toBeLessThan(-50000);
      expect(escala.domain[1]).toBe(teto);
    });
  });

  describe("quando não há teto do ano", () => {
    it("volta a escalar pelo maior valor com folga", () => {
      // Arrange
      const total = 13855569;
      const mediana = 26904727;

      // Act
      const escala = deriveGastoCotaComparacaoEscala(total, mediana, null);

      // Assert
      expect(escala.tetoExcedido).toBe(false);
      expect(escala.domain).toEqual([0, mediana + mediana * 0.08]);
    });
  });
});

describe("leitura do total contra o teto do ano", () => {
  describe("quando o ano ainda está em curso", () => {
    it("qualifica o percentual com o mês final dos dados", () => {
      // Arrange
      const total = 13855569;
      const teto = 58472952;

      // Act
      const leitura = formatGastoCotaTeto(
        total,
        { amountCents: teto, monthCount: 12 },
        8,
      );

      // Assert
      expect(leitura).toBe("24% do teto do ano (dados até agosto)");
    });
  });

  describe("quando o ano está fechado", () => {
    it("dispensa o qualificador", () => {
      // Arrange
      const total = 46778362;
      const teto = 58472952;

      // Act
      const leitura = formatGastoCotaTeto(
        total,
        { amountCents: teto, monthCount: 12 },
        12,
      );

      // Assert
      expect(leitura).toBe("80% do teto do ano");
    });
  });

  describe("quando o total ultrapassa o teto tabelado", () => {
    it("informa o excedente em valor, não em percentual", () => {
      // Arrange
      const teto = 58472952;
      const total = teto + 123456;

      // Act
      const leitura = formatGastoCotaTeto(
        total,
        { amountCents: teto, monthCount: 12 },
        12,
      );

      // Assert
      expect(leitura).toBe("R$ 1.234,56 acima do teto do ano");
    });
  });

  describe("quando o teto cobre só parte do ano", () => {
    it("troca o escopo do ano pelo do período exercido", () => {
      // Arrange
      const teto = 21418665;

      // Act
      const leitura = formatGastoCotaTeto(
        10709332,
        { amountCents: teto, monthCount: 5 },
        12,
      );

      // Assert
      expect(leitura).toBe("50% do teto do período");
    });
  });

  describe("quando o total não é positivo", () => {
    it("evita um percentual negativo sem sentido", () => {
      // Arrange
      const teto = 58472952;

      // Act
      const leitura = formatGastoCotaTeto(
        -5000,
        { amountCents: teto, monthCount: 12 },
        12,
      );

      // Assert
      expect(leitura).toBe("Nenhum valor consumido do teto do ano");
    });
  });
});

describe("leitura do total contra a mediana da UF", () => {
  describe("quando os dois valores são positivos", () => {
    it("expressa a distância em percentual da mediana", () => {
      // Arrange
      const total = 13855569;
      const mediana = 26904727;

      // Act
      const leitura = formatGastoCotaComparacao(total, mediana);

      // Assert
      expect(leitura).toBe("49% abaixo da mediana");
    });
  });

  describe("quando o total é negativo", () => {
    it("expressa a distância em valor absoluto", () => {
      // Arrange
      const mediana = 26904727;

      // Act
      const leitura = formatGastoCotaComparacao(-100, mediana);

      // Assert
      expect(leitura).toBe("R$ 269.048,27 abaixo da mediana");
    });
  });
});
