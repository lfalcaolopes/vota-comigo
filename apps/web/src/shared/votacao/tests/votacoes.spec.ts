import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import type { VotacaoNominal } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { Votacoes } from "../votacoes";

function makeVotacao(overrides: Partial<VotacaoNominal> = {}): VotacaoNominal {
  return {
    externalIdVotacao: "v-1",
    data: "2025-03-14",
    descricao: "Votação padrão",
    placar: {
      placarCompleto: false,
      votosSim: 300,
      votosNao: 100,
      votosOutros: 5,
    },
    resultado: "aprovada",
    isReferenciaMatcher: false,
    ...overrides,
  };
}

function makeVotacoes(total: number): VotacaoNominal[] {
  return Array.from({ length: total }, (_, index) =>
    makeVotacao({
      externalIdVotacao: `v-${index + 1}`,
      descricao: `Votação ${index + 1}`,
      data: `2025-03-${String(total - index).padStart(2, "0")}`,
    }),
  );
}

function render(votacoes: VotacaoNominal[]): string {
  return renderToStaticMarkup(createElement(Votacoes, { votacoes }));
}

describe("Votacoes", () => {
  describe("lista vazia", () => {
    it("shows a message when there are no votacoes", () => {
      // Arrange
      const votacoes: VotacaoNominal[] = [];

      // Act
      const html = render(votacoes);

      // Assert
      expect(html).toContain("Nenhuma votação nominal em plenário registrada.");
      expect(html).not.toContain("Mostrar todas");
    });
  });

  describe("poucas votacoes", () => {
    it("does not offer the disclosure when all fit in the visible set", () => {
      // Arrange
      const votacoes = makeVotacoes(3);

      // Act
      const html = render(votacoes);

      // Assert
      expect(html).not.toContain("Mostrar todas");
      expect(html).not.toContain("<details");
    });
  });

  describe("muitas votacoes", () => {
    it("offers a disclosure counting every votacao", () => {
      // Arrange
      const votacoes = makeVotacoes(5);

      // Act
      const html = render(votacoes);

      // Assert
      expect(html).toContain("Mostrar todas (5)");
    });

    it("renders every votacao in the markup so crawlers and no-JS see all", () => {
      // Arrange
      const votacoes = makeVotacoes(5);

      // Act
      const html = render(votacoes);

      // Assert
      expect(html).toContain("Votação 1");
      expect(html).toContain("Votação 4");
      expect(html).toContain("Votação 5");
    });
  });
});
