import { describe, expect, it } from "vitest";

import { projectApuracao } from "../lib/projecao-apuracao";

const primeiroTurno = {
  sp001: { siglaUf: "sp", votosValidos: 1000, votosA: 400, votosB: 400 },
  sp002: { siglaUf: "sp", votosValidos: 1000, votosA: 200, votosB: 600 },
  ba001: { siglaUf: "ba", votosValidos: 1000, votosA: 600, votosB: 200 },
};

describe("projeção da apuração", () => {
  describe("sem nenhum município apurado", () => {
    it("repete a fatia dos dois candidatos no primeiro turno", () => {
      // Act
      const projecao = projectApuracao(primeiroTurno, {});

      // Assert
      expect(projecao.variacaoEntreTurnos).toBe(0);
      expect(projecao.shareA).toBeCloseTo(0.5, 5);
    });
  });

  describe("com todos os municípios totalizados", () => {
    it("converge para o resultado apurado", () => {
      // Arrange
      const parciais = {
        sp001: { votosA: 700, votosB: 300 },
        sp002: { votosA: 300, votosB: 700 },
        ba001: { votosA: 800, votosB: 200 },
      };

      // Act
      const projecao = projectApuracao(primeiroTurno, parciais);

      // Assert
      expect(projecao.shareA).toBeCloseTo(1800 / 3000, 5);
    });

    it("conta como apurados todos os votos esperados de cada estado", () => {
      // Arrange
      const parciais = {
        sp001: { votosA: 700, votosB: 300 },
        sp002: { votosA: 300, votosB: 700 },
        ba001: { votosA: 800, votosB: 200 },
      };

      // Act
      const projecao = projectApuracao(primeiroTurno, parciais);

      // Assert
      const sp = projecao.ufs.find((uf) => uf.siglaUf === "sp");
      expect(sp?.countedVotos).toBe(2000);
      expect(sp?.expectedVotos).toBe(2000);
    });
  });

  describe("com apuração adiantada só onde o candidato A é forte", () => {
    it("mede a variação contra o próprio município, não contra a parcial bruta", () => {
      // Arrange: ba001 counted at its first-round share plus 5pp
      const parciais = { ba001: { votosA: 400, votosB: 100 } };

      // Act
      const projecao = projectApuracao(primeiroTurno, parciais);

      // Assert
      expect(projecao.variacaoEntreTurnos).toBeCloseTo(0.05, 5);
      expect(projecao.shareA).toBeLessThan(0.6);
    });
  });
});
