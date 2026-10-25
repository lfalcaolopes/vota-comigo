import { describe, expect, it } from "vitest";

import {
  describeEstimativaSemApuracao,
  describeLideranca,
  formatNomeCandidato,
  formatVotosCompact,
  rankByRemainingVotos,
  toMapaFill,
} from "../lib/apuracao-presentation";

describe("apresentação da apuração", () => {
  describe("frase de liderança", () => {
    it("diz quem lidera e a diferença em pontos", () => {
      // Act
      const frase = describeLideranca(0.5243, "Lula", "Flávio Bolsonaro", 12);

      // Assert
      expect(frase).toBe("Lula lidera a projeção por 4,9 pontos");
    });

    it("nomeia o outro candidato quando ele está à frente", () => {
      // Act
      const frase = describeLideranca(0.47, "Lula", "Flávio Bolsonaro", 12);

      // Assert
      expect(frase).toBe("Flávio Bolsonaro lidera a projeção por 6,0 pontos");
    });

    it("não aponta liderança antes de 5% das urnas apuradas", () => {
      // Act
      const frase = describeLideranca(0.5243, "Lula", "Flávio Bolsonaro", 4.9);

      // Assert
      expect(frase).toBe(
        "Projeção ainda instável, com menos de 5% das urnas apuradas",
      );
    });

    it("usa o singular para uma diferença de um ponto", () => {
      // Act
      const frase = describeLideranca(0.505, "Lula", "Flávio Bolsonaro", 12);

      // Assert
      expect(frase).toBe("Lula lidera a projeção por 1,0 ponto");
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

  describe("onde ainda faltam votos", () => {
    it("ordena os estados pelo volume de votos ainda não apurados", () => {
      // Arrange
      const ufs = [
        { siglaUf: "rr", shareA: 0.3, expectedVotos: 300, countedVotos: 0 },
        {
          siglaUf: "sp",
          shareA: 0.45,
          expectedVotos: 25_000,
          countedVotos: 20_000,
        },
        {
          siglaUf: "ba",
          shareA: 0.7,
          expectedVotos: 9_000,
          countedVotos: 1_000,
        },
      ];

      // Act
      const ranking = rankByRemainingVotos(ufs, 2);

      // Assert
      expect(ranking.map((uf) => [uf.siglaUf, uf.remainingVotos])).toEqual([
        ["ba", 8_000],
        ["sp", 5_000],
      ]);
    });
  });

  describe("estimativa de estado sem urnas apuradas", () => {
    it("explica que vem do 1º turno ajustado pela variação do resto do país", () => {
      // Act
      const texto = describeEstimativaSemApuracao(
        0.0367,
        "Lula",
        "Flavio Bolsonaro",
      );

      // Assert
      expect(texto).toBe(
        "Nenhuma urna apurada ainda. Estimativa: resultado do 1º turno + variação de 3,7 pontos a favor de Lula, medida no resto do país.",
      );
    });

    it("nomeia o outro candidato quando a variação o favorece", () => {
      // Act
      const texto = describeEstimativaSemApuracao(
        -0.021,
        "Lula",
        "Flavio Bolsonaro",
      );

      // Assert
      expect(texto).toContain("2,1 pontos a favor de Flavio Bolsonaro");
    });

    it("diz que não há ajuste quando nenhuma urna foi apurada no país", () => {
      // Act
      const texto = describeEstimativaSemApuracao(
        0,
        "Lula",
        "Flavio Bolsonaro",
      );

      // Assert
      expect(texto).toContain("sem ajuste");
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
