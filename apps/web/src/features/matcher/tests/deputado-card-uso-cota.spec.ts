import type { MatcherDeputadoResumo } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoCard } from "../components/resultado/deputado-card";

function deputado(): MatcherDeputadoResumo {
  return {
    externalIdDeputado: 1,
    nome: "Maria",
    partido: "PT",
    siglaUf: "SP",
    urlFoto: null,
    compatibilidadeBruta: 80,
    amostraComparavel: 8,
    scoreOrdenacaoPercentual: 70,
    alertas: [],
    emAtividade: true,
    usoCota: {
      status: "calculavel",
      percentualTetoBase: 71.6,
      legislatura: 57,
      periodStart: "2023-02-01",
      coberturaAte: "2026-08-31",
      diasEmExercicio: 1_184,
    },
  };
}

describe("card do matcher com ordenação por cota", () => {
  it("mantém concordância e amostra e acrescenta o contexto da cota", () => {
    // Act
    const html = renderToStaticMarkup(
      createElement(DeputadoCard, {
        deputado: deputado(),
        totalPosicoesComputaveis: 10,
        showUsoCota: true,
      }),
    );

    // Assert
    expect(html).toContain("Concordância");
    expect(html).toContain("80%");
    expect(html).toContain("8 das suas 10 respostas entraram na conta");
    expect(html).toContain("Uso da cota: 72%");
    expect(html).toContain(
      "Período analisado: fev/2023 – ago/2026 · 1.184 dias em exercício",
    );
  });

  it("omite o resumo da cota na ordenação padrão", () => {
    // Act
    const html = renderToStaticMarkup(
      createElement(DeputadoCard, {
        deputado: deputado(),
        totalPosicoesComputaveis: 10,
      }),
    );

    // Assert
    expect(html).not.toContain("Uso da cota:");
  });
});
