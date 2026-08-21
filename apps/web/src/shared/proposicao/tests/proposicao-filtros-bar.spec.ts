import type { TemaDisponivel } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProposicaoFiltrosBar } from "../proposicao-filtros-bar";

const temas: readonly TemaDisponivel[] = [
  { externalCodTema: 40, tema: "Educação" },
];

function render(overrides: { query?: string } = {}): string {
  return renderToStaticMarkup(
    createElement(ProposicaoFiltrosBar, {
      draft: "",
      filtros: { ordenacao: "mais-votadas", tema: null },
      onApplyFiltros: vi.fn(),
      onClearSearch: vi.fn(),
      onClearTudo: vi.fn(),
      onDraftChange: vi.fn(),
      onSearch: vi.fn(),
      query: "",
      temas,
      ...overrides,
    }),
  );
}

function botoesDeOrdenacao(html: string): readonly string[] {
  const inicio = html.indexOf('aria-label="Ordenação"');
  const grupo = html.slice(inicio, html.indexOf("</div>", inicio));
  return [...grupo.matchAll(/<button[^>]*>/g)].map(([tag]) => tag);
}

describe("barra de filtros de proposições", () => {
  describe("quando há temas disponíveis", () => {
    it("exibe busca, ordenação e tema no mesmo agrupamento", () => {
      // Arrange
      const html = render();

      // Act
      const busca = html.indexOf('id="feed-search"');
      const ordenacao = html.indexOf('aria-label="Ordenação"');
      const temas = html.indexOf(">Temas<");

      // Assert
      expect(busca).toBeGreaterThanOrEqual(0);
      expect(ordenacao).toBeGreaterThan(busca);
      expect(temas).toBeGreaterThan(ordenacao);
      expect(html).toContain(">Limpar</button>");
      expect(html).not.toContain('aria-haspopup="dialog"');
    });
  });
  describe("quando uma busca está ativa", () => {
    it("desabilita a ordenação, que a busca por relevância ignora", () => {
      // Arrange
      const html = render({ query: "trabalho 6x1" });

      // Act
      const botoes = botoesDeOrdenacao(html);

      // Assert
      expect(botoes).toHaveLength(2);
      expect(botoes.every((botao) => botao.includes('disabled=""'))).toBe(true);
    });
  });

  describe("quando não há busca", () => {
    it("mantém a ordenação disponível", () => {
      // Arrange
      const html = render();

      // Act
      const botoes = botoesDeOrdenacao(html);

      // Assert
      expect(botoes).toHaveLength(2);
      expect(botoes.some((botao) => botao.includes('disabled=""'))).toBe(false);
    });
  });
});
