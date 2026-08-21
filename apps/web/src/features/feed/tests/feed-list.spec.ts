import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EMPTY_SEARCH_SUGGESTIONS } from "@/shared/proposicao";

import { FeedList } from "../components/feed-list";

function renderList(display: "empty-filtered" | "empty-default"): string {
  return renderToStaticMarkup(
    createElement(FeedList, {
      canLoadMore: false,
      display,
      items: [] as ProposicaoCard[],
      onClearTudo: () => {},
      onLoadMore: () => {},
      onSuggestSearch: () => {},
      status: "idle" as const,
      total: 0,
    }),
  );
}

describe("lista de propostas sem resultado", () => {
  describe("quando a busca ou o filtro não devolvem nada", () => {
    it("oferece termos de busca conhecidos como recomeço", () => {
      // Arrange / Act
      const html = renderList("empty-filtered");

      // Assert
      for (const termo of EMPTY_SEARCH_SUGGESTIONS) {
        expect(html).toContain(termo);
      }
    });

    it("mantém limpar busca e filtros como ação principal", () => {
      // Arrange / Act
      const html = renderList("empty-filtered");

      // Assert
      const limpar = html.indexOf("Limpar busca e filtros");
      const sugestoes = html.indexOf("Ou recomece por");
      expect(limpar).toBeGreaterThan(-1);
      expect(sugestoes).toBeGreaterThan(limpar);
    });

    it("não marca os termos como opções ligadas ou desligadas", () => {
      // Arrange / Act
      const html = renderList("empty-filtered");

      // Assert
      expect(html).not.toContain('aria-pressed="');
    });
  });

  describe("quando não há proposta alguma carregada", () => {
    it("não sugere termos, porque nenhuma busca devolveria resultado", () => {
      // Arrange / Act
      const html = renderList("empty-default");

      // Assert
      expect(html).not.toContain("Ou recomece por");
    });
  });
});
