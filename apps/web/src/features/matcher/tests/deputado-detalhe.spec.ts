import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { DeputadoCard } from "../components/deputado-card";
import { DeputadoDetalhe } from "../components/deputado-detalhe";

function detalhe(): MatcherDeputadoDetalhe {
  return {
    siglaUf: "PE",
    cidade: null,
    totalProposicoesSelecionadas: 3,
    totalPosicoesComputaveis: 3,
    deputado: {
      externalIdDeputado: 220593,
      nome: "Maria da Silva",
      partido: "PT",
      siglaUf: "PE",
      urlFoto: null,
      emAtividade: true,
    },
    metrics: {
      totalConcordancias: 3,
      totalDiscordancias: 0,
      totalForaDoDenominador: 0,
      amostraComparavel: 3,
      coberturaExercicio: 3,
      compatibilidadeBruta: 100,
      scoreOrdenacaoPercentual: 60,
      alertas: [],
    },
    votos: [],
  };
}

function resumo(): MatcherDeputadoResumo {
  return {
    externalIdDeputado: 220593,
    nome: "Maria da Silva",
    partido: "PT",
    siglaUf: "PE",
    urlFoto: null,
    compatibilidadeBruta: 100,
    amostraComparavel: 3,
    scoreOrdenacaoPercentual: 60,
    alertas: [],
    emAtividade: true,
  };
}

describe("DeputadoDetalhe", () => {
  describe("when showing the contextual detail of a result", () => {
    it("exposes the entry point to the public profile of the deputado", () => {
      // Act
      const html = renderToStaticMarkup(
        createElement(DeputadoDetalhe, {
          detalhe: detalhe(),
          detalheDeputadoId: 220593,
          status: "idle",
          onBack: () => {},
          onRetry: () => {},
        }),
      );

      // Assert
      expect(html).toContain('href="/deputados/220593"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain("Ver perfil do deputado");
    });
  });
});

describe("DeputadoCard", () => {
  describe("when listing a result in the ranking", () => {
    it("does not expose a link to the public profile", () => {
      // Act
      const html = renderToStaticMarkup(
        createElement(DeputadoCard, {
          deputado: resumo(),
          totalPosicoesComputaveis: 3,
          onOpen: () => {},
        }),
      );

      // Assert
      expect(html).not.toContain("/deputados/");
    });
  });
});
