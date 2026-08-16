import { describe, expect, it } from "vitest";

import {
  contarFiltrosAtivos,
  descreverFiltrosAtivos,
  FILTROS_PADRAO,
  removerFiltro,
  saoFiltrosIguais,
  type DeputadoFeedFiltros,
} from "../feed-filtros";
import { toggleValor } from "@/shared/ui";

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

    it("does not count the exercicio recorte left at its default", () => {
      // Act
      const count = contarFiltrosAtivos(
        filtros({ incluirForaDeExercicio: false }),
      );

      // Assert
      expect(count).toBe(0);
    });

    it("does not count an empty multiple selection", () => {
      // Act
      const count = contarFiltrosAtivos(filtros({ ufs: [], partidos: [] }));

      // Assert
      expect(count).toBe(0);
    });
  });

  describe("when a single value is selected", () => {
    it("names the estado instead of the UF code", () => {
      // Act
      const ativos = descreverFiltrosAtivos(filtros({ ufs: ["SP"] }));

      // Assert
      expect(ativos).toEqual([
        {
          id: "ufs",
          label: "Estado: São Paulo",
          removeLabel: "Remover filtro Estado: São Paulo",
        },
      ]);
    });

    it("names the partido by its sigla", () => {
      // Act
      const ativos = descreverFiltrosAtivos(filtros({ partidos: ["PT"] }));

      // Assert
      expect(ativos[0].label).toBe("Partido: PT");
    });

    it("names the faixa etaria by its range", () => {
      // Act
      const ativos = descreverFiltrosAtivos(
        filtros({ faixasEtarias: ["40-49"] }),
      );

      // Assert
      expect(ativos[0].label).toBe("Idade: 40 a 49 anos");
    });

    it("names the sexo in full", () => {
      // Act
      const ativos = descreverFiltrosAtivos(filtros({ sexo: "F" }));

      // Assert
      expect(ativos[0].label).toBe("Sexo: Feminino");
    });

    it("names the widened recorte without a value", () => {
      // Act
      const ativos = descreverFiltrosAtivos(
        filtros({ incluirForaDeExercicio: true }),
      );

      // Assert
      expect(ativos).toEqual([
        {
          id: "incluirForaDeExercicio",
          label: "Incluindo fora de exercício",
          removeLabel: "Remover filtro Incluindo fora de exercício",
        },
      ]);
    });
  });

  describe("when several values are selected in the same filter", () => {
    it("counts them instead of listing every name", () => {
      // Act
      const ativos = descreverFiltrosAtivos(
        filtros({ ufs: ["SP", "RJ", "MG"] }),
      );

      // Assert
      expect(ativos[0].label).toBe("Estado: 3 estados");
    });

    it("counts partidos with their own plural", () => {
      // Act
      const ativos = descreverFiltrosAtivos(
        filtros({ partidos: ["PT", "PL"] }),
      );

      // Assert
      expect(ativos[0].label).toBe("Partido: 2 partidos");
    });

    it("counts faixas etarias with their own plural", () => {
      // Act
      const ativos = descreverFiltrosAtivos(
        filtros({ faixasEtarias: ["40-49", "70-mais"] }),
      );

      // Assert
      expect(ativos[0].label).toBe("Idade: 2 faixas");
    });

    it("stays a single chip no matter how many values", () => {
      // Act
      const count = contarFiltrosAtivos(filtros({ ufs: ["SP", "RJ", "MG"] }));

      // Assert
      expect(count).toBe(1);
    });
  });

  describe("when several filters are active", () => {
    it("counts exactly the described ones", () => {
      // Arrange
      const ativos = filtros({
        incluirForaDeExercicio: true,
        ufs: ["RJ"],
        partidos: ["PL"],
        sexo: "F",
        faixasEtarias: ["50-59"],
      });

      // Act
      const descritos = descreverFiltrosAtivos(ativos);

      // Assert
      expect(descritos.map((filtro) => filtro.id)).toEqual([
        "incluirForaDeExercicio",
        "ufs",
        "partidos",
        "sexo",
        "faixasEtarias",
      ]);
      expect(contarFiltrosAtivos(ativos)).toBe(descritos.length);
    });
  });

  describe("when removing a single filter", () => {
    it("keeps the other filters untouched", () => {
      // Arrange
      const atuais = filtros({
        incluirForaDeExercicio: true,
        ufs: ["SP"],
        partidos: ["PT"],
      });

      // Act
      const proximos = removerFiltro(atuais, "ufs");

      // Assert
      expect(proximos).toEqual(
        filtros({ incluirForaDeExercicio: true, ufs: [], partidos: ["PT"] }),
      );
    });

    it("clears every value of a multiple filter at once", () => {
      // Arrange
      const atuais = filtros({ ufs: ["SP", "RJ", "MG"] });

      // Act
      const proximos = removerFiltro(atuais, "ufs");

      // Assert
      expect(proximos.ufs).toEqual([]);
    });

    it("returns the exercicio recorte to its default instead of inverting it", () => {
      // Arrange
      const atuais = filtros({ incluirForaDeExercicio: true });

      // Act
      const proximos = removerFiltro(atuais, "incluirForaDeExercicio");

      // Assert
      expect(proximos.incluirForaDeExercicio).toBe(false);
    });

    it("does not mutate the filters it received", () => {
      // Arrange
      const atuais = filtros({ ufs: ["SP"] });

      // Act
      removerFiltro(atuais, "ufs");

      // Assert
      expect(atuais.ufs).toEqual(["SP"]);
    });
  });

  describe("when toggling one value of a multiple filter", () => {
    it("adds a value that was not selected", () => {
      // Act
      const proximos = toggleValor(["SP"], "RJ");

      // Assert
      expect(proximos).toEqual(["SP", "RJ"]);
    });

    it("removes a value that was already selected", () => {
      // Act
      const proximos = toggleValor(["SP", "RJ"], "SP");

      // Assert
      expect(proximos).toEqual(["RJ"]);
    });

    it("does not mutate the list it received", () => {
      // Arrange
      const atuais = ["SP"];

      // Act
      toggleValor(atuais, "RJ");

      // Assert
      expect(atuais).toEqual(["SP"]);
    });
  });

  describe("when comparing a draft against what is applied", () => {
    it("treats the same values as equal regardless of object identity", () => {
      // Act
      const iguais = saoFiltrosIguais(
        filtros({ ufs: ["SP"], incluirForaDeExercicio: true }),
        filtros({ ufs: ["SP"], incluirForaDeExercicio: true }),
      );

      // Assert
      expect(iguais).toBe(true);
    });

    it("detects a single changed field", () => {
      // Act
      const iguais = saoFiltrosIguais(
        filtros({ ufs: ["SP"] }),
        filtros({ ufs: ["RJ"] }),
      );

      // Assert
      expect(iguais).toBe(false);
    });

    it("detects a value added to a multiple filter", () => {
      // Act
      const iguais = saoFiltrosIguais(
        filtros({ ufs: ["SP"] }),
        filtros({ ufs: ["SP", "RJ"] }),
      );

      // Assert
      expect(iguais).toBe(false);
    });

    // A ordem em que o usuário clicou nos chips não é filtro diferente.
    it("ignores the order values were selected in", () => {
      // Act
      const iguais = saoFiltrosIguais(
        filtros({ ufs: ["SP", "RJ"] }),
        filtros({ ufs: ["RJ", "SP"] }),
      );

      // Assert
      expect(iguais).toBe(true);
    });
  });
});
