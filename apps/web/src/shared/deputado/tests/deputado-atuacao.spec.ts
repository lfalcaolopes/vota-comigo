import type {
  DeputadoDiscursosResponse,
  DeputadoProposicoesAssinadasResponse,
} from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AtuacaoResumo } from "../deputado-atuacao";

const discursosResponse: DeputadoDiscursosResponse = {
  year: 2024,
  items: [],
  total: 7,
};

function render(
  proposicoesState:
    | { status: "success"; response: DeputadoProposicoesAssinadasResponse }
    | { status: "loading" }
    | { status: "error" },
): string {
  return renderToStaticMarkup(
    createElement(AtuacaoResumo, {
      discursosState: { status: "success", response: discursosResponse },
      proposicoesState,
    }),
  );
}

describe("resumo de atuação", () => {
  describe("quando o ano tem assinaturas carregadas", () => {
    it("exibe o total e o contador de primeiro signatário", () => {
      // Arrange
      const response: DeputadoProposicoesAssinadasResponse = {
        year: 2024,
        disponivel: true,
        total: 12,
        totalPrimeiroSignatario: 3,
      };

      // Act
      const html = render({ status: "success", response });

      // Assert
      expect(html).toContain("12");
      expect(html).toContain("3 como primeiro signatário");
      expect(html).not.toContain("Ano não carregado");
    });
  });

  describe("quando o ano está carregado mas o deputado não assinou nada", () => {
    it("exibe zero em vez do texto de lacuna", () => {
      // Arrange
      const response: DeputadoProposicoesAssinadasResponse = {
        year: 2024,
        disponivel: true,
        total: 0,
        totalPrimeiroSignatario: 0,
      };

      // Act
      const html = render({ status: "success", response });

      // Assert
      expect(html).toContain("0 como primeiro signatário");
      expect(html).not.toContain("Ano não carregado");
    });
  });

  describe("quando o ano não foi coberto pela ingestão", () => {
    it("exibe o texto de lacuna em vez de um número", () => {
      // Arrange
      const response: DeputadoProposicoesAssinadasResponse = {
        year: 2018,
        disponivel: false,
      };

      // Act
      const html = render({ status: "success", response });

      // Assert
      expect(html).toContain("Ano não carregado");
      expect(html).not.toContain("Indisponível");
    });
  });
});
