import type { ProposicaoCard, TemaDisponivel } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { StepSelecao } from "../components/selecao/step-selecao";

function card(overrides: Partial<ProposicaoCard> = {}): ProposicaoCard {
  return {
    externalIdProposicao: 1,
    siglaTipo: "PL",
    numero: 100,
    ano: 2024,
    ementa: "Ementa oficial.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2024-01-01",
    volumeVotacoesPlenario: 3,
    dataUltimaVotacao: "2024-06-01",
    ...overrides,
  };
}

const temas: readonly TemaDisponivel[] = [];

function render(selected: ProposicaoCard[]): string {
  return renderToStaticMarkup(
    createElement(StepSelecao, {
      items: [],
      total: 0,
      status: "idle",
      display: "list",
      canLoadMore: false,
      query: "",
      ordenacao: "recentes",
      tema: null,
      temas,
      selected,
      totalSelecionadas: selected.length,
      canAdvance: false,
      onToggle: vi.fn(),
      onSubmitSearch: vi.fn(),
      onClearSearch: vi.fn(),
      onChangeOrdenacao: vi.fn(),
      onChangeTema: vi.fn(),
      onClearFilters: vi.fn(),
      onLoadMore: vi.fn(),
      onBack: vi.fn(),
      onAdvance: vi.fn(),
    }),
  );
}

describe("StepSelecao sidebar (Sua seleção)", () => {
  describe("when a selected card has an approved AI resumo", () => {
    it("shows resumoIaCard instead of ementa in the sidebar", () => {
      // Arrange
      const selected = [
        card({
          resumoIaDisponivel: true,
          resumoIaCard: "Resumo curto aprovado.",
          ementa: "Ementa oficial.",
        }),
      ];

      // Act
      const html = render(selected);

      // Assert
      expect(html).toContain("Resumo curto aprovado.");
      expect(html).not.toContain("Ementa oficial.");
    });
  });

  describe("when a selected card has no AI resumo", () => {
    it("falls back to ementa in the sidebar", () => {
      // Arrange
      const selected = [
        card({
          resumoIaDisponivel: false,
          resumoIaCard: null,
          ementa: "Ementa oficial.",
        }),
      ];

      // Act
      const html = render(selected);

      // Assert
      expect(html).toContain("Ementa oficial.");
    });
  });
});
