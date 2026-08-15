import { describe, expect, it } from "vitest";

import {
  contarFiltrosAtivos,
  descreverFiltrosAtivos,
  FILTROS_PADRAO,
  removerFiltro,
  saoFiltrosIguais,
  type DeputadoFeedFiltros,
} from "../feed-filtros";

function filtros(
  overrides: Partial<DeputadoFeedFiltros> = {},
): DeputadoFeedFiltros {
  return { ...FILTROS_PADRAO, ...overrides };
}

describe("filtros da listagem de deputados", () => {
  describe("when nothing differs from the default", () => {
    it("reports no active filter", () => {
      // Act
      const ativos = descreverFiltrosAtivos(FILTROS_PADRAO);

      // Assert
      expect(ativos).toEqual([]);
      expect(contarFiltrosAtivos(FILTROS_PADRAO)).toBe(0);
    });

    it("does not count em atividade turned off", () => {
      // Act
      const count = contarFiltrosAtivos(filtros({ emAtividade: false }));

      // Assert
      expect(count).toBe(0);
    });
  });

  describe("when describing an active filter", () => {
    it("names the estado instead of the UF code", () => {
      // Act
      const ativos = descreverFiltrosAtivos(filtros({ uf: "SP" }));

      // Assert
      expect(ativos).toEqual([
        {
          id: "uf",
          label: "Estado: São Paulo",
          removeLabel: "Remover filtro Estado: São Paulo",
        },
      ]);
    });

    it("names the partido by its sigla", () => {
      // Act
      const ativos = descreverFiltrosAtivos(filtros({ partido: "PT" }));

      // Assert
      expect(ativos).toEqual([
        {
          id: "partido",
          label: "Partido: PT",
          removeLabel: "Remover filtro Partido: PT",
        },
      ]);
    });

    it("names em atividade without a value", () => {
      // Act
      const ativos = descreverFiltrosAtivos(filtros({ emAtividade: true }));

      // Assert
      expect(ativos).toEqual([
        {
          id: "emAtividade",
          label: "Em atividade",
          removeLabel: "Remover filtro Em atividade",
        },
      ]);
    });
  });

  describe("when several filters are active", () => {
    it("counts exactly the described ones", () => {
      // Arrange
      const ativos = filtros({ emAtividade: true, uf: "RJ", partido: "PL" });

      // Act
      const descritos = descreverFiltrosAtivos(ativos);

      // Assert
      expect(descritos.map((filtro) => filtro.id)).toEqual([
        "emAtividade",
        "uf",
        "partido",
      ]);
      expect(contarFiltrosAtivos(ativos)).toBe(descritos.length);
    });
  });

  describe("when removing a single filter", () => {
    it("keeps the other filters untouched", () => {
      // Arrange
      const atuais = filtros({ emAtividade: true, uf: "SP", partido: "PT" });

      // Act
      const proximos = removerFiltro(atuais, "uf");

      // Assert
      expect(proximos).toEqual(
        filtros({ emAtividade: true, uf: null, partido: "PT" }),
      );
    });

    it("returns em atividade to its default instead of inverting it", () => {
      // Arrange
      const atuais = filtros({ emAtividade: true });

      // Act
      const proximos = removerFiltro(atuais, "emAtividade");

      // Assert
      expect(proximos.emAtividade).toBe(false);
    });

    it("does not mutate the filters it received", () => {
      // Arrange
      const atuais = filtros({ uf: "SP" });

      // Act
      removerFiltro(atuais, "uf");

      // Assert
      expect(atuais.uf).toBe("SP");
    });
  });

  describe("when comparing a draft against what is applied", () => {
    it("treats the same values as equal regardless of object identity", () => {
      // Act
      const iguais = saoFiltrosIguais(
        filtros({ uf: "SP", emAtividade: true }),
        filtros({ uf: "SP", emAtividade: true }),
      );

      // Assert
      expect(iguais).toBe(true);
    });

    it("detects a single changed field", () => {
      // Act
      const iguais = saoFiltrosIguais(
        filtros({ uf: "SP" }),
        filtros({ uf: "RJ" }),
      );

      // Assert
      expect(iguais).toBe(false);
    });
  });
});
