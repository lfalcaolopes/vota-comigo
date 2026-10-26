import { describe, expect, it } from "vitest";

import {
  describeVencedor,
  formatNomeCandidato,
  formatPontos,
  formatUrnas,
  formatVotosCompact,
  toMapaFill,
} from "../lib/apuracao-presentation";

describe("apresentação da apuração", () => {
  describe("frase do vencedor", () => {
    it("diz quem venceu e com quanto dos votos válidos", () => {
      // Act
      const frase = describeVencedor(0.51769, "Lula", "Flavio Bolsonaro");

      // Assert
      expect(frase).toBe("Lula venceu com 51,8% dos votos válidos");
    });

    it("nomeia o outro candidato quando ele vence", () => {
      // Act
      const frase = describeVencedor(0.47, "Lula", "Flavio Bolsonaro");

      // Assert
      expect(frase).toBe("Flavio Bolsonaro venceu com 53,0% dos votos válidos");
    });
  });

  describe("diferença em pontos", () => {
    it("usa o singular abaixo de dois pontos e o plural a partir deles", () => {
      // Act / Assert
      expect(formatPontos(0.45)).toBe("0,5 ponto");
      expect(formatPontos(1)).toBe("1,0 ponto");
      expect(formatPontos(3.54)).toBe("3,5 pontos");
    });
  });

  describe("urnas apuradas", () => {
    it("arredonda para o percentual inteiro", () => {
      // Act / Assert
      expect(formatUrnas(80.75)).toBe("81%");
      expect(formatUrnas(9.1)).toBe("9%");
    });
  });

  describe("cor do estado no mapa", () => {
    it("usa a cor de quem lidera e escurece conforme a vantagem cresce", () => {
      // Act
      const apertada = toMapaFill(0.51);
      const ampla = toMapaFill(0.7);

      // Assert
      expect(apertada.series).toBe("a");
      expect(ampla.mix).toBeGreaterThan(apertada.mix);
    });

    it("atinge a cor cheia a partir de 30 pontos de vantagem", () => {
      // Act
      const trinta = toMapaFill(0.35);
      const quarenta = toMapaFill(0.3);

      // Assert
      expect(trinta).toEqual({ series: "b", mix: 100, isDark: true });
      expect(quarenta.mix).toBe(100);
    });
  });

  describe("votos em formato curto", () => {
    it("abrevia milhões e milhares", () => {
      // Act / Assert
      expect(formatVotosCompact(12_345_678)).toBe("12,3 mi");
      expect(formatVotosCompact(48_400)).toBe("48 mil");
      expect(formatVotosCompact(512)).toBe("512");
    });
  });

  describe("nome do candidato", () => {
    it("troca a caixa alta do TSE por nome próprio", () => {
      // Act / Assert
      expect(formatNomeCandidato("FLAVIO BOLSONARO")).toBe("Flavio Bolsonaro");
      expect(formatNomeCandidato("LULA")).toBe("Lula");
    });
  });
});
