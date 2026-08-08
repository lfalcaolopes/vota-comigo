import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProposicaoRow } from "../proposicao-row";

function card(overrides: Partial<ProposicaoCard> = {}): ProposicaoCard {
  return {
    externalIdProposicao: 42,
    siglaTipo: "PL",
    numero: 1234,
    ano: 2023,
    ementa: "Ementa oficial da Câmara.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2023-05-10",
    volumeVotacoesPlenario: 9,
    dataUltimaVotacao: "2025-03-14",
    ...overrides,
  };
}

const EMENTA_LONGA =
  "Reforma constitucional da previdência que cria um novo regime de " +
  "capitalização, reorganiza os regimes dos servidores e define regras de " +
  "transição.";

function render(proposicao: ProposicaoCard, href?: string): string {
  return renderToStaticMarkup(
    createElement(ProposicaoRow, { card: proposicao, href }),
  );
}

describe("ProposicaoRow", () => {
  describe("resumo de proposicao por IA", () => {
    it("shows the card resumo when it is available", () => {
      // Arrange
      const proposicao = card({
        resumoIaDisponivel: true,
        resumoIaCard: "Resumo curto aprovado.",
      });

      // Act
      const html = render(proposicao);

      // Assert
      expect(html).toContain("Resumo curto aprovado.");
      expect(html).not.toContain("Ementa oficial da Câmara.");
    });

    it("tags the resumo with a visible IA badge", () => {
      // Arrange
      const proposicao = card({
        resumoIaDisponivel: true,
        resumoIaCard: "Resumo curto aprovado.",
      });

      // Act
      const html = render(proposicao);

      // Assert
      expect(html).toContain("Resumo por IA");
    });

    it("keeps the ementa fallback when the resumo is unavailable", () => {
      // Arrange
      const proposicao = card({
        resumoIaDisponivel: false,
        resumoIaCard: null,
      });

      // Act
      const html = render(proposicao);

      // Assert
      expect(html).toContain("Ementa oficial da Câmara.");
      expect(html).not.toContain("Resumo curto aprovado.");
    });

    it("does not tag the official ementa fallback with the IA badge", () => {
      // Arrange
      const proposicao = card({
        resumoIaDisponivel: false,
        resumoIaCard: null,
      });

      // Act
      const html = render(proposicao);

      // Assert
      expect(html).not.toContain("Resumo por IA");
    });
  });

  describe("when the card stands on its own and the resumo is long", () => {
    it("offers an expand control named after the proposicao", () => {
      // Arrange
      const proposicao = card({ ementa: EMENTA_LONGA });

      // Act
      const html = render(proposicao);

      // Assert
      expect(html).toContain(EMENTA_LONGA);
      expect(html).toContain('aria-label="Ver mais do resumo de PL 1234/2023"');
    });
  });

  describe("when the whole card links to the proposicao page", () => {
    it("leaves the resumo clamped, since the card itself opens the full text", () => {
      // Arrange
      const proposicao = card({ ementa: EMENTA_LONGA });

      // Act
      const html = render(proposicao, "/proposicoes/42");

      // Assert
      expect(html).toContain('href="/proposicoes/42"');
      expect(html).not.toContain("<button");
    });
  });
});
