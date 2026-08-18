import type { TemaDisponivel } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  contarFiltrosAtivos,
  descreverFiltrosAtivos,
  FILTROS_PADRAO,
  removerFiltro,
  saoFiltrosIguais,
  type ProposicaoFeedFiltros,
} from "../feed-filtros";

const temas: readonly TemaDisponivel[] = [
  { externalCodTema: 37, tema: "Direitos Humanos" },
  { externalCodTema: 40, tema: "Meio Ambiente" },
];

function filtros(
  overrides: Partial<ProposicaoFeedFiltros> = {},
): ProposicaoFeedFiltros {
  return { ...FILTROS_PADRAO, ...overrides };
}

describe("filtros do feed de propostas", () => {
  describe("quando nada difere do padrão", () => {
    it("não descreve nenhum filtro ativo", () => {
      // Act
      const ativos = descreverFiltrosAtivos(filtros(), temas);

      // Assert
      expect(ativos).toEqual([]);
      expect(contarFiltrosAtivos(filtros(), temas)).toBe(0);
    });

    it("não conta a ordenação padrão", () => {
      // Act
      const ativos = descreverFiltrosAtivos(
        filtros({ ordenacao: "mais-votadas" }),
        temas,
      );

      // Assert
      expect(ativos).toEqual([]);
    });
  });

  describe("quando a ordenação difere do padrão", () => {
    it("descreve a ordenação escolhida pelo rótulo legível", () => {
      // Act
      const ativos = descreverFiltrosAtivos(
        filtros({ ordenacao: "mais-recentes" }),
        temas,
      );

      // Assert
      expect(ativos).toEqual([
        {
          id: "ordenacao",
          label: "Ordenação: Mais recentes",
          removeLabel: "Remover filtro Ordenação: Mais recentes",
        },
      ]);
    });
  });

  describe("quando há um tema escolhido", () => {
    it("descreve o tema pelo nome", () => {
      // Act
      const ativos = descreverFiltrosAtivos(filtros({ tema: 37 }), temas);

      // Assert
      expect(ativos[0].label).toBe("Tema: Direitos Humanos");
    });

    it("mantém o chip removível quando o tema não está na lista", () => {
      // Act
      const ativos = descreverFiltrosAtivos(filtros({ tema: 999 }), temas);

      // Assert
      expect(ativos[0].label).toBe("Tema");
      expect(ativos[0].removeLabel).toBe("Remover filtro Tema");
    });
  });

  describe("ao remover um filtro pelo identificador", () => {
    it("devolve a ordenação ao padrão em vez de esvaziá-la", () => {
      // Act
      const proximo = removerFiltro(
        filtros({ ordenacao: "mais-recentes", tema: 37 }),
        "ordenacao",
      );

      // Assert
      expect(proximo).toEqual(filtros({ tema: 37 }));
    });

    it("descarta o tema escolhido", () => {
      // Act
      const proximo = removerFiltro(
        filtros({ ordenacao: "mais-recentes", tema: 37 }),
        "tema",
      );

      // Assert
      expect(proximo).toEqual(filtros({ ordenacao: "mais-recentes" }));
    });
  });

  describe("ao comparar dois recortes", () => {
    it("distingue recortes com temas diferentes", () => {
      // Act
      const iguais = saoFiltrosIguais(
        filtros({ tema: 37 }),
        filtros({ tema: 40 }),
      );

      // Assert
      expect(iguais).toBe(false);
    });

    it("reconhece recortes idênticos", () => {
      // Act
      const iguais = saoFiltrosIguais(
        filtros({ ordenacao: "mais-recentes", tema: 37 }),
        filtros({ ordenacao: "mais-recentes", tema: 37 }),
      );

      // Assert
      expect(iguais).toBe(true);
    });
  });
});
