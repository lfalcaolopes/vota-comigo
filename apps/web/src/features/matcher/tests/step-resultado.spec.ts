import type {
  EscopoMatcher,
  MatcherResultado,
  PartidoDisponivel,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { StepResultado } from "../components/resultado/step-resultado";
import { initMatcherState, type MatcherState } from "../lib/matcher-state";
import {
  RESULTADO_FILTROS_PADRAO,
  type ResultadoFiltros,
} from "../lib/resultado-filtros";

const PARTIDOS: readonly PartidoDisponivel[] = [
  { siglaPartido: "PT" },
  { siglaPartido: "PL" },
];

function proposicao(externalIdProposicao: number): ProposicaoCard {
  return {
    externalIdProposicao,
    siglaTipo: "PL",
    numero: externalIdProposicao,
    ano: 2024,
    ementa: `Ementa ${externalIdProposicao}`,
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2024-01-01",
    volumeVotacoesPlenario: 1,
    dataUltimaVotacao: "2024-06-01",
  };
}

function resultadoVazio(): MatcherResultado {
  return {
    siglaUf: "SP",
    cidade: null,
    totalProposicoesSelecionadas: 1,
    totalPosicoesComputaveis: 1,
    escopo: "estadual",
    deputados: [],
    totalDeputadosAvaliados: 12,
    deputadosHistoricoIncompleto: 0,
    total: 0,
    limit: 20,
    offset: 0,
  };
}

function estado(): MatcherState {
  return {
    ...initMatcherState([]),
    isHydrated: true,
    siglaUf: "SP",
    selected: [proposicao(1)],
    posicoes: new Map([[1, "aprovar" as const]]),
    resultados: { estadual: resultadoVazio(), nacional: null },
  };
}

function render(
  filtros: ResultadoFiltros,
  escopo: EscopoMatcher = "estadual",
): string {
  return renderToStaticMarkup(
    createElement(StepResultado, {
      state: estado(),
      status: "idle" as const,
      resultado: resultadoVazio(),
      escopo,
      filtros,
      partidos: PARTIDOS,
      hasMore: false,
      onRetry: vi.fn(),
      onEscopoChange: vi.fn(),
      onApplyFiltros: vi.fn(),
      onToggleFiltroConcordancia: vi.fn(),
      onLoadMore: vi.fn(),
      onStartComparativoSelection: vi.fn(),
      onToggleComparativoDeputado: vi.fn(),
      onCancelComparativoSelection: vi.fn(),
      onOpenComparativo: vi.fn(),
    }),
  );
}

describe("resultado do matcher", () => {
  describe("quando nenhum deputado passa por um recorte de partido", () => {
    it("mostra o estado vazio genérico do recorte", () => {
      // Act
      const html = render({
        ...RESULTADO_FILTROS_PADRAO,
        partidos: ["PT"],
      });

      // Assert
      expect(html).toContain("Nenhum deputado no recorte");
      expect(html).toContain(
        "Resultado atualizado: nenhum deputado no recorte",
      );
    });
  });

  describe("quando nenhum deputado passa pelo recorte de sexo", () => {
    it("mostra o mesmo estado vazio genérico", () => {
      // Act
      const html = render({ ...RESULTADO_FILTROS_PADRAO, sexo: "F" });

      // Assert
      expect(html).toContain("Nenhum deputado no recorte");
    });
  });

  describe("quando nenhum deputado passa pelo recorte de amostra pequena", () => {
    it("mostra o mesmo estado vazio genérico", () => {
      // Act
      const html = render({
        ...RESULTADO_FILTROS_PADRAO,
        ocultarAmostraPequena: true,
      });

      // Assert
      expect(html).toContain("Nenhum deputado no recorte");
    });
  });

  describe("quando o recorte de atividade esvazia o resultado", () => {
    it("mostra o estado vazio do recorte, não o diagnóstico por escopo", () => {
      // Act
      const html = render({
        ...RESULTADO_FILTROS_PADRAO,
        apenasEmAtividade: true,
      });

      // Assert: há deputados comparáveis; o que esvaziou a lista foi o filtro
      expect(html).toContain("Nenhum deputado no recorte");
      expect(html).not.toContain("Nenhum comparável neste estado");
    });
  });

  describe("quando o recorte esvazia o resultado no escopo estadual", () => {
    it("oferece ampliar a busca para o Brasil", () => {
      // Act
      const html = render({ ...RESULTADO_FILTROS_PADRAO, sexo: "F" });

      // Assert
      expect(html).toContain("Ver todos os deputados (Brasil)");
    });

    it("não oferece ampliar quando o escopo já é nacional", () => {
      // Act
      const html = render(
        { ...RESULTADO_FILTROS_PADRAO, sexo: "F" },
        "nacional",
      );

      // Assert
      expect(html).toContain("Nenhum deputado no recorte");
      expect(html).not.toContain("Ver todos os deputados (Brasil)");
    });
  });

  describe("quando o recorte de concordância esvazia o resultado", () => {
    it("mantém o diagnóstico próprio da concordância", () => {
      // Act
      const html = render({
        ...RESULTADO_FILTROS_PADRAO,
        partidos: ["PT"],
        externalIdProposicoesFiltroConcordancia: [1],
      });

      // Assert
      expect(html).not.toContain("Nenhum deputado no recorte");
      expect(html).toContain(
        "nenhum deputado votou com você em todas as proposições marcadas",
      );
    });
  });

  describe("quando não há recorte nenhum", () => {
    it("mostra o estado vazio sem filtros", () => {
      // Act
      const html = render(RESULTADO_FILTROS_PADRAO);

      // Assert
      expect(html).not.toContain("Nenhum deputado no recorte");
      expect(html).toContain(
        "Resultado atualizado: nenhum deputado encontrado",
      );
    });
  });
});
