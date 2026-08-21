import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  buildComparativoHref,
  buildResultadoHref,
  getFurthestMatcherRoute,
  parseComparativoIds,
  parseResultadoUrlState,
  resolveMatcherRoute,
  resolvePosicoesSegment,
  stepStatus,
  toPosicoesHref,
} from "../lib/matcher-route";
import { RESULTADO_FILTROS_URL_PADRAO } from "../lib/resultado-filtros";
import type { MatcherRascunho } from "../lib/matcher-rascunho";

function emptyRascunho(): MatcherRascunho {
  return {
    siglaUf: null,
    escopo: "estadual",
    selected: [],
    posicoes: new Map(),
    externalIdProposicoesFiltroConcordancia: [],
  };
}

function card(externalIdProposicao: number): ProposicaoCard {
  return {
    externalIdProposicao,
    siglaTipo: "PL",
    numero: externalIdProposicao,
    ano: 2023,
    ementa: "Dispõe sobre alguma coisa.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2023-05-10",
    volumeVotacoesPlenario: 9,
    dataUltimaVotacao: "2025-03-14",
  };
}

describe("matcher route", () => {
  describe("when two deputados are selected for comparison", () => {
    it("preserves their selection order in the comparison address", () => {
      // Arrange
      const selectedIds = [7, 5];

      // Act
      const href = buildComparativoHref(selectedIds);
      const parsedIds = parseComparativoIds("7,5");

      // Assert
      expect(href).toBe("/matcher/comparativo/7,5");
      expect(parsedIds).toEqual(selectedIds);
    });
  });

  describe("when the comparison segment is URL-encoded", () => {
    it("reads the ids delivered by the app router", () => {
      // Arrange / Act
      const parsedIds = parseComparativoIds("20%2C10");

      // Assert
      expect(parsedIds).toEqual([20, 10]);
    });
  });

  describe("when three deputados are selected for comparison", () => {
    it("preserves their selection order in the comparison address", () => {
      // Arrange
      const selectedIds = [7, 5, 9];

      // Act
      const href = buildComparativoHref(selectedIds);
      const parsedIds = parseComparativoIds("7,5,9");

      // Assert
      expect(href).toBe("/matcher/comparativo/7,5,9");
      expect(parsedIds).toEqual(selectedIds);
    });
  });

  describe("when comparison ids are invalid", () => {
    it("rejects invalid arity, repeated ids and non-numeric segments", () => {
      // Arrange
      const invalidSegments = ["7", "7,5,9,11", "7,7", "7,maria", "%E0%A4%A"];

      // Act
      const parsedIds = invalidSegments.map(parseComparativoIds);

      // Assert
      expect(parsedIds).toEqual([null, null, null, null, null]);
    });
  });

  describe("when resultado filters are absent", () => {
    it("uses the default resultado filters", () => {
      // Arrange / Act
      const filters = parseResultadoUrlState({});

      // Assert
      expect(filters).toEqual({
        escopo: "estadual",
        ...RESULTADO_FILTROS_URL_PADRAO,
      });
    });
  });

  describe("when the national scope is requested", () => {
    it("uses the national resultado scope", () => {
      // Arrange / Act
      const filters = parseResultadoUrlState({ escopo: "nacional" });

      // Assert
      expect(filters.escopo).toBe("nacional");
    });
  });

  describe("when active deputados are requested", () => {
    it("enables the activity filter", () => {
      // Arrange / Act
      const filters = parseResultadoUrlState({ atividade: "1" });

      // Assert
      expect(filters.apenasEmAtividade).toBe(true);
    });
  });

  describe("when resultado filters are invalid", () => {
    it("falls back to the default resultado filters", () => {
      // Arrange / Act
      const filters = parseResultadoUrlState({
        escopo: "municipal",
        atividade: "sim",
      });

      // Assert
      expect(filters).toEqual({
        escopo: "estadual",
        ...RESULTADO_FILTROS_URL_PADRAO,
      });
    });
  });

  describe("when the requested partidos are repeated in the address", () => {
    it("reads a deduplicated, upper-cased selection", () => {
      // Arrange / Act
      const filters = parseResultadoUrlState({ partido: ["pt", "PT", "psol"] });

      // Assert
      expect(filters.partidos).toEqual(["PT", "PSOL"]);
    });
  });

  describe("when a small sample recorte is requested", () => {
    it("enables the amostra filter", () => {
      // Arrange / Act
      const filters = parseResultadoUrlState({ amostra: "1" });

      // Assert
      expect(filters.ocultarAmostraPequena).toBe(true);
    });
  });

  describe("when a sexo recorte is requested", () => {
    it("reads the requested sexo", () => {
      // Arrange / Act
      const filters = parseResultadoUrlState({ sexo: "F" });

      // Assert
      expect(filters.sexo).toBe("F");
    });

    it("ignores a sexo outside the enum", () => {
      // Arrange / Act
      const filters = parseResultadoUrlState({ sexo: "X" });

      // Assert
      expect(filters.sexo).toBeNull();
    });
  });

  describe("when resultado filters change", () => {
    it("builds an address with the non-default filters", () => {
      // Arrange / Act
      const href = buildResultadoHref({
        escopo: "nacional",
        apenasEmAtividade: true,
        partidos: ["PSOL", "PT"],
        ocultarAmostraPequena: true,
        sexo: "F",
      });

      // Assert
      expect(href).toBe(
        "/matcher/resultado?escopo=nacional&atividade=1&partido=PSOL&partido=PT&amostra=1&sexo=F",
      );
    });
  });

  describe("when the browser goes back to an address with every recorte", () => {
    it("reads back the same state the address was built from", () => {
      // Arrange
      const state = {
        escopo: "nacional" as const,
        sort: "compatibilidade" as const,
        apenasEmAtividade: true,
        partidos: ["PSOL", "PT"],
        ocultarAmostraPequena: true,
        sexo: "M" as const,
      };

      // Act
      const search = new URLSearchParams(
        buildResultadoHref(state).split("?")[1],
      );
      const lido = parseResultadoUrlState({
        escopo: search.get("escopo") ?? undefined,
        atividade: search.get("atividade") ?? undefined,
        partido: search.getAll("partido"),
        amostra: search.get("amostra") ?? undefined,
        sexo: search.get("sexo") ?? undefined,
        sort: search.get("sort") ?? undefined,
      });

      // Assert
      expect(lido).toEqual(state);
    });
  });

  describe("when cota ordering is requested", () => {
    it("persists it while omitting compatibility ordering", () => {
      // Arrange / Act
      const cota = buildResultadoHref({
        ...RESULTADO_FILTROS_URL_PADRAO,
        escopo: "estadual",
        sort: "menor-uso-cota",
      });
      const compatibilidade = buildResultadoHref({
        ...RESULTADO_FILTROS_URL_PADRAO,
        escopo: "estadual",
      });

      // Assert
      expect(cota).toBe("/matcher/resultado?sort=menor-uso-cota");
      expect(compatibilidade).toBe("/matcher/resultado");
    });
  });

  describe("when a proposition position is requested", () => {
    it("resolves the one-based address to its selected proposition", () => {
      // Arrange / Act
      const position = resolvePosicoesSegment("2", 3);

      // Assert
      expect(position).toEqual({ view: "card", index: 1 });
    });

    it("limits an address above the selection to the last proposition", () => {
      // Arrange / Act
      const position = resolvePosicoesSegment("8", 3);

      // Assert
      expect(position).toEqual({ view: "card", index: 2 });
    });

    it("limits a numeric address below one to the first proposition", () => {
      // Arrange / Act
      const position = resolvePosicoesSegment("0", 3);

      // Assert
      expect(position).toEqual({ view: "card", index: 0 });
    });

    it("distinguishes review from a proposition index", () => {
      // Arrange / Act
      const position = resolvePosicoesSegment("revisao", 3);

      // Assert
      expect(position).toEqual({ view: "revisao" });
    });

    it("rejects an unrecognized non-numeric segment", () => {
      // Arrange / Act
      const position = resolvePosicoesSegment("desconhecido", 3);

      // Assert
      expect(position).toBeNull();
    });
  });

  describe("when navigating to a proposition position", () => {
    it("builds a one-based address from the internal index", () => {
      // Arrange / Act
      const href = toPosicoesHref({ view: "card", index: 1 });

      // Assert
      expect(href).toBe("/matcher/posicoes/2");
    });
  });

  describe("when showing the step indicator", () => {
    it("marks earlier, current and later routes from the current address", () => {
      // Arrange / Act / Assert
      expect(stepStatus("/matcher/posicoes", "/matcher/local")).toBe("done");
      expect(stepStatus("/matcher/posicoes", "/matcher/posicoes")).toBe(
        "current",
      );
      expect(stepStatus("/matcher/posicoes", "/matcher/resultado")).toBe(
        "upcoming",
      );
    });
  });

  describe("when the user has informed a UF", () => {
    it("supports the proposicoes step", () => {
      // Arrange
      const rascunho = { ...emptyRascunho(), siglaUf: "SP" as const };

      // Act
      const route = getFurthestMatcherRoute(rascunho);

      // Assert
      expect(route).toBe("/matcher/proposicoes");
    });
  });

  describe("when the user has selected enough proposicoes", () => {
    it("supports the posicoes step", () => {
      // Arrange
      const rascunho = {
        ...emptyRascunho(),
        siglaUf: "SP" as const,
        selected: [card(1), card(2), card(3)],
      };

      // Act
      const route = getFurthestMatcherRoute(rascunho);

      // Assert
      expect(route).toBe("/matcher/posicoes");
    });
  });

  describe("when the rascunho is a valid matcher execution", () => {
    it("supports the resultado step", () => {
      // Arrange
      const rascunho = {
        ...emptyRascunho(),
        siglaUf: "SP" as const,
        selected: [card(1), card(2), card(3)],
        posicoes: new Map([
          [1, "aprovar" as const],
          [2, "rejeitar" as const],
          [3, "aprovar" as const],
        ]),
      };

      // Act
      const route = getFurthestMatcherRoute(rascunho);

      // Assert
      expect(route).toBe("/matcher/resultado");
    });
  });

  describe("when a deep route is opened with an empty rascunho", () => {
    it("redirects to the local step", () => {
      // Arrange
      const rascunho = emptyRascunho();

      // Act
      const destination = resolveMatcherRoute("/matcher/resultado", rascunho);

      // Assert
      expect(destination).toBe("/matcher/local");
    });
  });

  describe("when a route is ahead of the rascunho", () => {
    it("redirects to the furthest supported step", () => {
      // Arrange
      const rascunho = { ...emptyRascunho(), siglaUf: "SP" as const };

      // Act
      const destination = resolveMatcherRoute("/matcher/resultado", rascunho);

      // Assert
      expect(destination).toBe("/matcher/proposicoes");
    });
  });
});
