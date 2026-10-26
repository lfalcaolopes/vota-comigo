import { describe, expect, it } from "vitest";

import { toResultadoFinal } from "../lib/resultado-apuracao";

const data = {
  tseUpdatedAt: "25/10/2026 21:39:30",
  urnasApuradas: 99.9,
  candidatoA: { numero: "13", nome: "LULA", votos: 600 },
  candidatoB: { numero: "22", nome: "FLAVIO BOLSONARO", votos: 400 },
  ufs: [
    { siglaUf: "rr", urnasApuradas: 100, votosA: 30, votosB: 70 },
    { siglaUf: "ba", urnasApuradas: 99.8, votosA: 570, votosB: 330 },
  ],
};

describe("resultado final da apuração", () => {
  describe("fatia de cada candidato", () => {
    it("divide os votos de A pelos votos dos dois candidatos", () => {
      // Act
      const resultado = toResultadoFinal(data);

      // Assert
      expect(resultado.shareA).toBeCloseTo(0.6, 5);
      expect(resultado.ufs.find((uf) => uf.siglaUf === "rr")?.shareA).toBe(0.3);
    });
  });

  describe("ordem dos estados", () => {
    it("lista primeiro os estados com mais votos", () => {
      // Act
      const resultado = toResultadoFinal(data);

      // Assert
      expect(resultado.ufs.map((uf) => uf.siglaUf)).toEqual(["ba", "rr"]);
    });
  });
});
