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
  describe("assunto da proposta", () => {
    it("shows the topic tag when one is given", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(ProposicaoRow, {
          card: card(),
          href: "/proposicoes/42",
          topic: "Porte de arma",
        }),
      );

      // Assert
      expect(html).toContain("Porte de arma");
    });

    it("omits the tag when there is no topic", () => {
      // Arrange / Act
      const html = render(card(), "/proposicoes/42");

      // Assert
      expect(html).not.toContain("bg-info-soft");
    });
  });

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

    it("leaves the IA badge to the surrounding list on phones when asked", () => {
      // Arrange
      const proposicao = card({
        resumoIaDisponivel: true,
        resumoIaCard: "Resumo curto aprovado.",
      });

      // Act
      const html = renderToStaticMarkup(
        createElement(ProposicaoRow, {
          card: proposicao,
          href: "/proposicoes/42",
          showResumoIaBadgeOnMobile: false,
        }),
      );

      // Assert
      expect(html).toContain("max-sm:hidden");
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
