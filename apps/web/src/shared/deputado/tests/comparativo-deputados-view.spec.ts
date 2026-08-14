import type {
  ComparativoDeputado,
  ComparativoDeputadosResponse,
} from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ComparativoDeputadosView } from "../comparativo-deputados-view";

function deputado(
  externalIdDeputado: number,
  overrides: Partial<ComparativoDeputado> = {},
): ComparativoDeputado {
  return {
    externalIdDeputado,
    nomePublico: `Deputado ${externalIdDeputado}`,
    nomeCivil: `Deputado ${externalIdDeputado} da Silva`,
    fonteOficial: `https://www.camara.leg.br/deputados/${externalIdDeputado}`,
    emAtividade: true,
    snapshotPublicoDisponivel: true,
    snapshotPublico: {
      nomeEleitoral: `Deputado ${externalIdDeputado}`,
      siglaPartido: "PT",
      siglaUf: "MG",
      urlFoto: null,
    },
    legislaturaInicialPeriodo: null,
    legislaturaFinalPeriodo: null,
    resumoPresencaDisponivel: true,
    resumoPresenca: {
      percentualPresenca: 92,
      presencas: 92,
      totalVotacoesEmExercicio: 100,
      ausenciasSemMotivoConhecido: 8,
    },
    proposicoesAssinadas: {
      year: 2025,
      disponivel: true,
      total: 12,
      totalPrimeiroSignatario: 3,
      coveredThroughDate: "2025-08-14",
    },
    orgaos: { year: 2025, items: [], total: 0 },
    cota: {
      status: "comparavel",
      percentualSobreMedianaUf: 112,
      medianaUf: { siglaUf: "MG", deputadoCount: 53 },
    },
    ...overrides,
  };
}

function render(response: ComparativoDeputadosResponse): string {
  return renderToStaticMarkup(
    createElement(ComparativoDeputadosView, { response }),
  );
}

describe("ComparativoDeputadosView", () => {
  describe("quando dois deputados são comparados em um ano", () => {
    it("mostra cada métrica e leva ao perfil em nova aba", () => {
      // Arrange / Act
      const html = render({
        year: 2025,
        comparableYears: [2025],
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).toContain("Presença registrada");
      expect(html).toContain("Proposições assinadas em 2025");
      expect(html).toContain("Comissões e outros órgãos em 2025");
      expect(html).toContain("Cota parlamentar em 2025");
      expect(html).toContain('href="/deputados/1"');
      expect(html).toContain('target="_blank"');
    });

    it("mostra a posição na cota sem o valor gasto", () => {
      // Arrange / Act
      const html = render({
        year: 2025,
        comparableYears: [2025],
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).toContain("12% acima da mediana");
      expect(html).toContain("Comparação com 53 deputados de MG");
      expect(html).not.toContain("R$");
    });
  });

  describe("quando não há ano comparável", () => {
    it("explica que só identidade e presença aparecem", () => {
      // Arrange
      const semAno = { proposicoesAssinadas: null, orgaos: null, cota: null };

      // Act
      const html = render({
        year: null,
        comparableYears: [],
        items: [deputado(1, semAno), deputado(2, semAno)],
      });

      // Assert
      expect(html).toContain("não têm nenhum ano em comum");
      expect(html).toContain("Sem ano comparável");
    });
  });
});
