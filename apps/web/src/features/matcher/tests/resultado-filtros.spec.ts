import { describe, expect, it } from "vitest";

import {
  contarResultadoFiltrosAtivos,
  descreverResultadoFiltrosAtivos,
  removerResultadoFiltro,
  RESULTADO_FILTROS_PADRAO,
  saoResultadoFiltrosIguais,
  toggleResultadoFiltroConcordancia,
  type ResultadoFiltros,
} from "../lib/resultado-filtros";

function filtros(overrides: Partial<ResultadoFiltros> = {}): ResultadoFiltros {
  return { ...RESULTADO_FILTROS_PADRAO, ...overrides };
}

describe("filtros do resultado do matcher", () => {
  describe("quando nada difere do padrão", () => {
    it("não descreve nenhum filtro ativo", () => {
      // Act
      const ativos = descreverResultadoFiltrosAtivos(filtros());

      // Assert
      expect(ativos).toEqual([]);
      expect(contarResultadoFiltrosAtivos(filtros())).toBe(0);
    });
  });

  describe("quando o recorte de atividade está ligado", () => {
    it("descreve o filtro com o rótulo do interruptor", () => {
      // Act
      const ativos = descreverResultadoFiltrosAtivos(
        filtros({ apenasEmAtividade: true }),
      );

      // Assert
      expect(ativos).toEqual([
        {
          id: "apenasEmAtividade",
          label: "Apenas em atividade",
          removeLabel: "Remover filtro Apenas em atividade",
        },
      ]);
    });
  });

  describe("quando há proposições marcadas na concordância", () => {
    it("conta o conjunto inteiro como um filtro só", () => {
      // Arrange
      const marcado = filtros({
        externalIdProposicoesFiltroConcordancia: [1, 2, 3],
      });

      // Act
      const ativos = descreverResultadoFiltrosAtivos(marcado);

      // Assert
      expect(contarResultadoFiltrosAtivos(marcado)).toBe(1);
      expect(ativos[0].label).toBe("Concordância: 3 proposições");
    });

    it("usa o singular com uma única proposição marcada", () => {
      // Act
      const ativos = descreverResultadoFiltrosAtivos(
        filtros({ externalIdProposicoesFiltroConcordancia: [7] }),
      );

      // Assert
      expect(ativos[0].label).toBe("Concordância: 1 proposição");
    });
  });

  describe("ao remover um filtro pelo identificador", () => {
    it("descarta todas as marcações de concordância de uma vez", () => {
      // Arrange
      const marcado = filtros({
        apenasEmAtividade: true,
        externalIdProposicoesFiltroConcordancia: [1, 2],
      });

      // Act
      const proximo = removerResultadoFiltro(
        marcado,
        "externalIdProposicoesFiltroConcordancia",
      );

      // Assert
      expect(proximo).toEqual(filtros({ apenasEmAtividade: true }));
    });

    it("desliga apenas o recorte de atividade", () => {
      // Arrange
      const marcado = filtros({
        apenasEmAtividade: true,
        externalIdProposicoesFiltroConcordancia: [1],
      });

      // Act
      const proximo = removerResultadoFiltro(marcado, "apenasEmAtividade");

      // Assert
      expect(proximo).toEqual(
        filtros({ externalIdProposicoesFiltroConcordancia: [1] }),
      );
    });
  });

  describe("ao alternar uma proposição da concordância", () => {
    it("acrescenta a proposição ainda não marcada", () => {
      // Act
      const proximo = toggleResultadoFiltroConcordancia(
        filtros({ externalIdProposicoesFiltroConcordancia: [1] }),
        2,
      );

      // Assert
      expect(proximo.externalIdProposicoesFiltroConcordancia).toEqual([1, 2]);
    });

    it("retira a proposição já marcada", () => {
      // Act
      const proximo = toggleResultadoFiltroConcordancia(
        filtros({ externalIdProposicoesFiltroConcordancia: [1, 2] }),
        1,
      );

      // Assert
      expect(proximo.externalIdProposicoesFiltroConcordancia).toEqual([2]);
    });
  });

  describe("quando há partidos selecionados", () => {
    it("descreve a sigla quando só há uma", () => {
      // Act
      const ativos = descreverResultadoFiltrosAtivos(
        filtros({ partidos: ["PT"] }),
      );

      // Assert
      expect(ativos).toEqual([
        {
          id: "partidos",
          label: "Partido: PT",
          removeLabel: "Remover filtro Partido: PT",
        },
      ]);
    });

    it("conta a seleção inteira como um filtro só", () => {
      // Arrange
      const selecionado = filtros({ partidos: ["PT", "PL", "PSOL"] });

      // Act
      const ativos = descreverResultadoFiltrosAtivos(selecionado);

      // Assert
      expect(contarResultadoFiltrosAtivos(selecionado)).toBe(1);
      expect(ativos[0].label).toBe("Partido: 3 partidos");
    });

    it("volta ao padrão ao remover o filtro", () => {
      // Act
      const proximo = removerResultadoFiltro(
        filtros({ partidos: ["PT"] }),
        "partidos",
      );

      // Assert
      expect(proximo.partidos).toEqual([]);
    });
  });

  describe("quando a amostra pequena está oculta", () => {
    it("descreve o filtro com o rótulo do interruptor", () => {
      // Act
      const ativos = descreverResultadoFiltrosAtivos(
        filtros({ ocultarAmostraPequena: true }),
      );

      // Assert
      expect(ativos).toEqual([
        {
          id: "ocultarAmostraPequena",
          label: "Ocultar amostra pequena",
          removeLabel: "Remover filtro Ocultar amostra pequena",
        },
      ]);
    });
  });

  describe("quando há um sexo selecionado", () => {
    it("descreve o filtro com o rótulo do sexo", () => {
      // Act
      const ativos = descreverResultadoFiltrosAtivos(filtros({ sexo: "F" }));

      // Assert
      expect(ativos).toEqual([
        {
          id: "sexo",
          label: "Sexo: Feminino",
          removeLabel: "Remover filtro Sexo: Feminino",
        },
      ]);
    });

    it("volta ao padrão ao remover o filtro", () => {
      // Act
      const proximo = removerResultadoFiltro(filtros({ sexo: "M" }), "sexo");

      // Assert
      expect(proximo.sexo).toBeNull();
    });
  });

  describe("ao comparar dois recortes", () => {
    it("ignora a ordem das proposições marcadas", () => {
      // Act
      const iguais = saoResultadoFiltrosIguais(
        filtros({ externalIdProposicoesFiltroConcordancia: [1, 2] }),
        filtros({ externalIdProposicoesFiltroConcordancia: [2, 1] }),
      );

      // Assert
      expect(iguais).toBe(true);
    });

    it("ignora a ordem dos partidos selecionados", () => {
      // Act
      const iguais = saoResultadoFiltrosIguais(
        filtros({ partidos: ["PT", "PL"] }),
        filtros({ partidos: ["PL", "PT"] }),
      );

      // Assert
      expect(iguais).toBe(true);
    });

    it("distingue recortes com partidos diferentes", () => {
      // Act
      const iguais = saoResultadoFiltrosIguais(
        filtros({ partidos: ["PT"] }),
        filtros({ partidos: ["PL"] }),
      );

      // Assert
      expect(iguais).toBe(false);
    });

    it("distingue o recorte de amostra pequena", () => {
      // Act
      const iguais = saoResultadoFiltrosIguais(
        filtros({ ocultarAmostraPequena: true }),
        filtros({ ocultarAmostraPequena: false }),
      );

      // Assert
      expect(iguais).toBe(false);
    });

    it("distingue o recorte de sexo", () => {
      // Act
      const iguais = saoResultadoFiltrosIguais(
        filtros({ sexo: "F" }),
        filtros({ sexo: "M" }),
      );

      // Assert
      expect(iguais).toBe(false);
    });

    it("distingue recortes com marcações diferentes", () => {
      // Act
      const iguais = saoResultadoFiltrosIguais(
        filtros({ externalIdProposicoesFiltroConcordancia: [1] }),
        filtros({ externalIdProposicoesFiltroConcordancia: [2] }),
      );

      // Assert
      expect(iguais).toBe(false);
    });
  });
});
