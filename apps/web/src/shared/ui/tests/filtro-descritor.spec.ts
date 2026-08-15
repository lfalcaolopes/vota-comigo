import { describe, expect, it } from "vitest";

import { toFiltroAtivo } from "../filtro-descritor";

describe("descritor de filtro ativo", () => {
  describe("quando o filtro é um interruptor sem valor", () => {
    it("usa apenas o nome do filtro no rótulo", () => {
      // Act
      const filtro = toFiltroAtivo("emAtividade", "Em atividade");

      // Assert
      expect(filtro).toEqual({
        id: "emAtividade",
        label: "Em atividade",
        removeLabel: "Remover filtro Em atividade",
      });
    });
  });

  describe("quando o filtro tem um valor escolhido", () => {
    it("compõe nome e valor no rótulo e na ação de remover", () => {
      // Act
      const filtro = toFiltroAtivo("uf", "Estado", "São Paulo");

      // Assert
      expect(filtro.label).toBe("Estado: São Paulo");
      expect(filtro.removeLabel).toBe("Remover filtro Estado: São Paulo");
    });
  });
});
