import type { DeputadoOrgaosResponse } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoOrgaosSection } from "../deputado-atuacao";

function render(response: DeputadoOrgaosResponse): string {
  return renderToStaticMarkup(
    createElement(DeputadoOrgaosSection, {
      state: { status: "success", response },
    }),
  );
}

describe("comissões e outros órgãos", () => {
  describe("quando um órgão tem mais de um vínculo", () => {
    it("exibe cada vínculo separadamente", () => {
      // Arrange
      const response: DeputadoOrgaosResponse = {
        year: 2024,
        total: 2,
        items: [
          {
            externalIdOrgao: 2001,
            siglaOrgao: "CCJC",
            nome: "Comissão de Constituição e Justiça e de Cidadania",
            titulo: "Titular",
            dataInicio: "2024-02-01",
            dataFim: "2024-06-30",
          },
          {
            externalIdOrgao: 2001,
            siglaOrgao: "CCJC",
            nome: "Comissão de Constituição e Justiça e de Cidadania",
            titulo: "Suplente",
            dataInicio: "2024-07-01",
            dataFim: null,
          },
        ],
      };

      // Act
      const html = render(response);

      // Assert
      expect(
        html.match(/Comissão de Constituição e Justiça e de Cidadania/g),
      ).toHaveLength(2);
      expect(html).toContain("Titular");
      expect(html).toContain("01/02/2024 a 30/06/2024");
      expect(html).toContain("Suplente");
      expect(html).toContain("Desde 01/07/2024");
      expect(html).not.toContain("Ver mais vínculos");
    });
  });

  describe("quando há mais de três vínculos", () => {
    it("mantém três visíveis e recolhe os demais em um controle nativo", () => {
      // Arrange
      const response: DeputadoOrgaosResponse = {
        year: 2024,
        total: 5,
        items: Array.from({ length: 5 }, (_, index) => ({
          externalIdOrgao: 2001 + index,
          siglaOrgao: `ORG${index + 1}`,
          nome: `Órgão ${index + 1}`,
          titulo: "Titular",
          dataInicio: "2024-02-01",
          dataFim: null,
        })),
      };

      // Act
      const html = render(response);
      const detailsStart = html.indexOf("<details");
      const visibleContent = html.slice(0, detailsStart);
      const collapsedContent = html.slice(detailsStart);

      // Assert
      expect(visibleContent).toContain("Órgão 1");
      expect(visibleContent).toContain("Órgão 2");
      expect(visibleContent).toContain("Órgão 3");
      expect(visibleContent).not.toContain("Órgão 4");
      expect(collapsedContent).toContain("Órgão 4");
      expect(collapsedContent).toContain("Órgão 5");
      expect(html).toContain("Ver mais vínculos (2)");
      expect(html).not.toContain("Recolher vínculos");
      expect(html).not.toContain("<details open");
      const summaryTag = collapsedContent.slice(
        collapsedContent.indexOf("<summary"),
        collapsedContent.indexOf(">", collapsedContent.indexOf("<summary")),
      );
      expect(summaryTag).toContain("text-muted");
      expect(summaryTag).toContain("group-open:hidden");
      expect(summaryTag).not.toContain("text-info");
      expect(summaryTag).not.toContain("underline");
    });
  });

  describe("quando não há vínculo no ano", () => {
    it("mantém a seção visível", () => {
      // Arrange
      const response: DeputadoOrgaosResponse = {
        year: 2024,
        total: 0,
        items: [],
      };

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("Comissões e outros órgãos");
      expect(html).toContain("Nenhum vínculo registrado neste ano");
    });
  });
});
