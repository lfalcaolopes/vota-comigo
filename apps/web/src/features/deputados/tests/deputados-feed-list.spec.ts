import type { DeputadoCard } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadosFeedList } from "../components/deputados-feed-list";

function card(externalIdDeputado: number, nomePublico: string): DeputadoCard {
  return {
    externalIdDeputado,
    nomePublico,
    nomeCivil: nomePublico,
    siglaPartido: "PT",
    siglaUf: "SP",
    urlFoto: null,
    emAtividade: true,
  };
}

const items = [card(220593, "Maria da Silva"), card(204554, "João de Souza")];

function render(
  selection?: Parameters<typeof DeputadosFeedList>[0]["selection"],
): string {
  return renderToStaticMarkup(
    createElement(DeputadosFeedList, {
      canLoadMore: false,
      display: "results",
      items,
      onClearTudo: () => {},
      onLoadMore: () => {},
      selection,
      status: "idle",
      total: items.length,
    }),
  );
}

describe("listagem de deputados", () => {
  describe("quando o modo de seleção está desligado", () => {
    it("leva cada linha ao perfil do deputado", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain('href="/deputados/220593"');
      expect(html).not.toContain('type="checkbox"');
    });
  });

  describe("quando o modo de seleção está ligado", () => {
    it("troca o link do perfil por caixas de seleção", () => {
      // Arrange / Act
      const html = render({
        hasLimit: false,
        onToggle: () => {},
        selectedIds: [220593],
      });

      // Assert
      expect(html).not.toContain('href="/deputados/220593"');
      expect(html).toContain(
        'aria-label="Selecionar Maria da Silva para comparação"',
      );
    });

    it("bloqueia os não selecionados quando o limite é atingido", () => {
      // Arrange / Act
      const html = render({
        hasLimit: true,
        onToggle: () => {},
        selectedIds: [220593],
      });

      // Assert
      expect(html.split("João de Souza")[0]).toContain('aria-disabled="true"');
    });
  });
});
