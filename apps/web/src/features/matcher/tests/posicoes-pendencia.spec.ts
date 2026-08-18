import { describe, expect, it } from "vitest";

import { toPosicoesPendencia } from "../lib/posicoes-pendencia";

describe("Pendência das posições", () => {
  describe("quando ainda há propostas sem resposta", () => {
    it("pede para responder todas e conta quantas faltam", () => {
      // Act
      const pendencia = toPosicoesPendencia({
        faltamRespostas: 3,
        faltamComputaveis: 0,
      });

      // Assert
      expect(pendencia).toEqual({
        instrucao: "Responda todas para ver o resultado.",
        contagem: "Faltam 3 propostas.",
      });
    });

    it("concorda o verbo e o substantivo no singular", () => {
      // Act
      const pendencia = toPosicoesPendencia({
        faltamRespostas: 1,
        faltamComputaveis: 0,
      });

      // Assert
      expect(pendencia?.contagem).toBe("Falta 1 proposta.");
    });

    it("prevalece sobre a pendência de respostas computáveis", () => {
      // Act
      const pendencia = toPosicoesPendencia({
        faltamRespostas: 2,
        faltamComputaveis: 2,
      });

      // Assert
      expect(pendencia?.instrucao).toBe("Responda todas para ver o resultado.");
    });
  });

  describe("quando tudo foi respondido mas faltam respostas computáveis", () => {
    it("pede Sim ou Não e mostra quantas já valem", () => {
      // Act
      const pendencia = toPosicoesPendencia({
        faltamRespostas: 0,
        faltamComputaveis: 2,
      });

      // Assert
      expect(pendencia).toEqual({
        instrucao: "Responda Sim ou Não em pelo menos 3 propostas.",
        contagem: "Você tem 1.",
      });
    });
  });

  describe("quando nada está pendente", () => {
    it("não produz aviso", () => {
      // Act
      const pendencia = toPosicoesPendencia({
        faltamRespostas: 0,
        faltamComputaveis: 0,
      });

      // Assert
      expect(pendencia).toBeNull();
    });
  });
});
