import { describe, expect, it } from "vitest";

import { toSnapshotEvent, toUrnasStep } from "../lib/snapshot-apuracao";
import type { ApuracaoSnapshot } from "../lib/tse-apuracao";

function snapshotAt(urnasApuradas: number): ApuracaoSnapshot {
  return {
    tseUpdatedAt: "25/10/2026 19:40:12",
    urnasApuradas,
    municipiosApurados: 1200,
    candidatoA: { numero: "13", nome: "LULA", votos: 1000 },
    candidatoB: { numero: "22", nome: "FLAVIO BOLSONARO", votos: 900 },
    oficialShareA: 0.526,
    urnasApuradasByUf: {},
    projecao: { shareA: 0.511, variacaoEntreTurnos: 0.03, ufs: [] },
  };
}

describe("snapshot da apuração a cada 5% das urnas", () => {
  describe("faixa de urnas", () => {
    it("arredonda para baixo até o múltiplo de 5 mais próximo", () => {
      // Act / Assert
      expect(toUrnasStep(4.99)).toBe(0);
      expect(toUrnasStep(10.42)).toBe(10);
      expect(toUrnasStep(100)).toBe(100);
    });
  });

  describe("antes de 5% das urnas", () => {
    it("não gera snapshot", () => {
      // Act
      const event = toSnapshotEvent(snapshotAt(3.2));

      // Assert
      expect(event).toBeNull();
    });
  });

  describe("depois de entrar em uma nova faixa", () => {
    it("guarda o percentual real, a apuração oficial e a projeção", () => {
      // Act
      const event = toSnapshotEvent(snapshotAt(10.42));

      // Assert
      expect(event).toEqual({
        externalCdEleicao: "6258",
        urnasStep: 10,
        urnasApuradas: 10.42,
        numeroA: "13",
        numeroB: "22",
        oficialShareA: 0.526,
        projecaoShareA: 0.511,
        tseUpdatedAt: "25/10/2026 19:40:12",
        source: "site",
      });
    });
  });
});
