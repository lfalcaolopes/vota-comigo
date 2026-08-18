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
    it("exibe o total e o contador de autor principal", () => {
      // Arrange
      const response: DeputadoProposicoesAssinadasResponse = {
        year: 2024,
        disponivel: true,
        total: 12,
        totalPrimeiroSignatario: 3,
        coveredThroughDate: "2026-08-13",
      };

      // Act
      const html = render({ status: "success", response });

      // Assert
      expect(html).toContain("12");
      expect(html).toContain("3 como autor principal");
      expect(html).not.toContain("Ano não carregado");
    });
  });

  describe("quando o ano exibido é o que a fonte ainda está preenchendo", () => {
    it("informa até quando a Câmara foi lida", () => {
      // Arrange
      const response: DeputadoProposicoesAssinadasResponse = {
        year: 2026,
        disponivel: true,
        total: 236,
        totalPrimeiroSignatario: 212,
        coveredThroughDate: "2026-08-13",
      };

      // Act
      const html = render({ status: "success", response });

      // Assert
      expect(html).toContain("13 de agosto de 2026");
    });
  });

  describe("quando o ano exibido já está inteiramente coberto", () => {
    it("omite a linha de cobertura", () => {
      // Arrange
      const response: DeputadoProposicoesAssinadasResponse = {
        year: 2024,
        disponivel: true,
        total: 12,
        totalPrimeiroSignatario: 3,
        coveredThroughDate: "2026-08-13",
      };

      // Act
      const html = render({ status: "success", response });

      // Assert
      expect(html).not.toContain("atualização");
    });
  });

  describe("quando a fronteira da fonte não é conhecida", () => {
    it("omite a linha de cobertura em vez de inventar uma data", () => {
      // Arrange
      const response: DeputadoProposicoesAssinadasResponse = {
        year: 2026,
        disponivel: true,
        total: 236,
        totalPrimeiroSignatario: 212,
        coveredThroughDate: null,
      };

      // Act
      const html = render({ status: "success", response });

      // Assert
      expect(html).not.toContain("atualização");
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
        coveredThroughDate: "2026-08-13",
      };

      // Act
      const html = render({ status: "success", response });

      // Assert
      expect(html).toContain("0 como autor principal");
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
