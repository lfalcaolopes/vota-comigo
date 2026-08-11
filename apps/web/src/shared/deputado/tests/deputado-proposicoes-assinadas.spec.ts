import type { DeputadoProposicoesAssinadasResponse } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoProposicoesAssinadasSection } from "../deputado-proposicoes-assinadas";

const TEXTOS_PROIBIDOS = [
  "Proposições de autoria",
  "Proposições criadas",
  "Proposições que apresentou",
  "Projetos criados",
  "Iniciativas do deputado",
  "projetos de lei",
];

function response(): DeputadoProposicoesAssinadasResponse {
  return {
    year: 2022,
    total: 2,
    items: [
      {
        externalIdProposicao: 2318532,
        siglaTipo: "REQ",
        numero: 388,
        ano: 2022,
        ementa: "Requer a criação da Comissão Especial.",
        dataApresentacao: "2022-03-23",
        urlOficial:
          "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2318532",
      },
      {
        externalIdProposicao: 2314871,
        siglaTipo: "RDF",
        numero: 1,
        ano: null,
        ementa: "Aprova o texto do Acordo sobre a Mobilidade.",
        dataApresentacao: "2022-02-09",
        urlOficial:
          "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2314871",
      },
    ],
  };
}

function render(
  state: Parameters<typeof DeputadoProposicoesAssinadasSection>[0]["state"],
) {
  return renderToStaticMarkup(
    createElement(DeputadoProposicoesAssinadasSection, { state }),
  );
}

describe("seção de proposições assinadas", () => {
  describe("quando o ano tem proposições assinadas", () => {
    it("mantém a contagem colada ao rótulo e não atribui iniciativa ao deputado", () => {
      // Arrange
      const state = { status: "success" as const, response: response() };

      // Act
      const html = render(state);

      // Assert
      expect(html).toContain("Proposições assinadas");
      expect(html).toContain("2 proposições assinadas em 2022");
      expect(html).toContain("como proponente ou apoiador");
      for (const proibido of TEXTOS_PROIBIDOS) {
        expect(html).not.toContain(proibido);
      }
    });

    it("identifica cada proposição e leva à página oficial em nova aba", () => {
      // Arrange
      const state = { status: "success" as const, response: response() };

      // Act
      const html = render(state);

      // Assert
      expect(html).toContain("REQ 388/2022");
      expect(html).toContain("Requer a criação da Comissão Especial.");
      expect(html).toContain("23/03/2022");
      expect(html).toContain(
        'href="https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2318532"',
      );
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noreferrer"');
    });

    it("omite o ano legislativo ausente em vez de exibir uma barra vazia", () => {
      // Arrange
      const state = { status: "success" as const, response: response() };

      // Act
      const html = render(state);

      // Assert
      expect(html).toContain("RDF 1");
      expect(html).not.toContain("RDF 1/");
    });
  });

  describe("quando o ano não tem proposições assinadas", () => {
    it("distingue ausência de dados de falha de carregamento", () => {
      // Arrange
      const state = {
        status: "success" as const,
        response: { year: 2022, total: 0, items: [] },
      };

      // Act
      const html = render(state);

      // Assert
      expect(html).toContain(
        "Não há proposições assinadas disponíveis para este ano.",
      );
      expect(html).not.toContain("Não foi possível carregar");
      expect(html).toContain("0 proposições assinadas em 2022");
    });
  });

  describe("quando a consulta à Câmara falha", () => {
    it("informa a falha sem apresentar contagem parcial", () => {
      // Arrange
      const state = { status: "error" as const };

      // Act
      const html = render(state);

      // Assert
      expect(html).toContain(
        "Não foi possível carregar as proposições assinadas agora.",
      );
      expect(html).not.toContain("proposições assinadas em");
    });
  });
});
