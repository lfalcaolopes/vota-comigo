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

function render(proposicao: ProposicaoCard): string {
  return renderToStaticMarkup(
    createElement(ProposicaoRow, { card: proposicao }),
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
  });
});
