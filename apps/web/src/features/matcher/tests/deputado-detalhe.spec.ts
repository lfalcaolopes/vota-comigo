import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  DeputadoPerfil,
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { StepComparativo } from "../components/comparativo/step-comparativo";
import { DeputadoDetalhe } from "../components/detalhe/deputado-detalhe";
import { DeputadoCard } from "../components/resultado/deputado-card";
import { StepResultado } from "../components/resultado/step-resultado";
import { initMatcherState, matcherReducer } from "../lib/matcher-state";

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

function perfil(externalIdDeputado: number, nomePublico: string): DeputadoPerfil {
  return {
    externalIdDeputado,
    nomePublico,
    nomeCivil: null,
    fonteOficial: `https://www.camara.leg.br/deputados/${externalIdDeputado}`,
    historicoParlamentarDisponivel: true,
    snapshotPublicoDisponivel: true,
    snapshotPublico: {
      nomeEleitoral: nomePublico,
      siglaPartido: "PT",
      siglaUf: "PE",
      urlFoto: null,
    },
    emAtividade: true,
    redesSociais: [],
    dataNascimento: null,
    municipioNascimento: null,
    ufNascimento: null,
    externalIdLegislaturaInicial: null,
    externalIdLegislaturaFinal: null,
    resumoPresencaDisponivel: false,
    resumoPresenca: null,
    historicoPartidarioDisponivel: false,
    historicoPartidario: [],
  };
}

function resultado(deputados: MatcherDeputadoResumo[]) {
  return {
    siglaUf: "PE" as const,
    cidade: null,
    totalProposicoesSelecionadas: 3,
    totalPosicoesComputaveis: 3,
    escopo: "estadual" as const,
    deputados,
    totalDeputadosAvaliados: deputados.length,
    deputadosHistoricoIncompleto: 0,
    total: deputados.length,
    limit: 20,
    offset: 0,
    semBomMatch: false,
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

    it("does not expose selection controls in normal mode", () => {
      // Act
      const html = renderToStaticMarkup(
        createElement(DeputadoCard, {
          deputado: resumo(),
          totalPosicoesComputaveis: 3,
          onOpen: () => {},
        }),
      );

      // Assert
      expect(html).not.toContain('type="checkbox"');
      expect(html).toContain("Compatibilidade");
    });
  });

  describe("when selecting deputados for comparativo", () => {
    it("exposes a checked checkbox for a selected deputado", () => {
      // Act
      const html = renderToStaticMarkup(
        createElement(DeputadoCard, {
          comparativoSelection: {
            disabled: false,
            onToggle: () => {},
            selected: true,
          },
          deputado: resumo(),
          totalPosicoesComputaveis: 3,
          onOpen: () => {},
        }),
      );

      // Assert
      expect(html).toContain('type="checkbox"');
      expect(html).toContain("checked");
      expect(html).toContain("Selecionar Maria da Silva para comparação");
    });
  });
});

describe("StepResultado", () => {
  describe("when showing matcher results in normal mode", () => {
    it("shows the entry point to compare deputados", () => {
      // Arrange
      const r = resultado([resumo()]);
      const state = matcherReducer(initMatcherState([]), {
        type: "runOk",
        escopo: "estadual",
        resultado: r,
      });

      // Act
      const html = renderToStaticMarkup(
        createElement(StepResultado, {
          apenasEmAtividade: false,
          escopo: "estadual",
          hasMore: false,
          onApenasEmAtividadeChange: () => {},
          onBack: () => {},
          onCancelComparativoSelection: () => {},
          onEscopoChange: () => {},
          onLoadMore: () => {},
          onOpenComparativo: () => {},
          onOpenDetalhe: () => {},
          onRetry: () => {},
          onStartComparativoSelection: () => {},
          onToggleComparativoDeputado: () => {},
          resultado: r,
          state,
          status: "idle",
        }),
      );

      // Assert
      expect(html).toContain("Comparar deputados");
      expect(html).not.toContain("Selecionar Maria da Silva para comparação");
    });
  });

  describe("when selecting deputados for comparativo", () => {
    it("shows selection controls and the limit microcopy", () => {
      // Arrange
      const deputados = [resumo(), { ...resumo(), externalIdDeputado: 220594 }];
      let state = matcherReducer(initMatcherState([]), {
        type: "runOk",
        escopo: "estadual",
        resultado: resultado(deputados),
      });
      state = matcherReducer(state, { type: "startComparativoSelection" });
      for (const deputado of [
        resumo(),
        { ...resumo(), externalIdDeputado: 220594 },
        { ...resumo(), externalIdDeputado: 220595 },
      ]) {
        state = matcherReducer(state, {
          type: "toggleComparativoDeputado",
          deputado,
        });
      }

      // Act
      const html = renderToStaticMarkup(
        createElement(StepResultado, {
          apenasEmAtividade: false,
          escopo: "estadual",
          hasMore: false,
          onApenasEmAtividadeChange: () => {},
          onBack: () => {},
          onCancelComparativoSelection: () => {},
          onEscopoChange: () => {},
          onLoadMore: () => {},
          onOpenComparativo: () => {},
          onOpenDetalhe: () => {},
          onRetry: () => {},
          onStartComparativoSelection: () => {},
          onToggleComparativoDeputado: () => {},
          resultado: resultado(deputados),
          state,
          status: "idle",
        }),
      );

      // Assert
      expect(html).toContain("Cancelar");
      expect(html).toContain("Comparar");
      expect(html).toContain("Você pode comparar até 3 deputados.");
      expect(html).toContain('type="checkbox"');
    });
  });
});

describe("StepComparativo", () => {
  describe("when opened from matcher results", () => {
    it("shows selected deputados in selection order", () => {
      // Act
      const html = renderToStaticMarkup(
        createElement(StepComparativo, {
          deputados: [
            { ...resumo(), externalIdDeputado: 2, nome: "Deputada B" },
            { ...resumo(), externalIdDeputado: 1, nome: "Deputado A" },
          ],
          detalhes: [],
          perfis: [perfil(2, "Deputada B"), perfil(1, "Deputado A")],
          onBack: () => {},
          onRetry: () => {},
          posicoes: [],
          status: "idle",
        }),
      );

      // Assert
      expect(html.indexOf("Deputada B")).toBeLessThan(html.indexOf("Deputado A"));
      expect(html).toContain("Voltar ao resultado");
    });
  });
});
