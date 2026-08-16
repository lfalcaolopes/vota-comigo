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

type Props = Parameters<typeof DeputadosFeedList>[0];

function render(
  selection?: Props["selection"],
  overrides: Partial<Props> = {},
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
      ...overrides,
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

  describe("quando nada é encontrado sob o recorte de exercício", () => {
    it("oferece ampliar a busca para fora de exercício", () => {
      // Arrange / Act
      const html = render(undefined, {
        display: "empty-filtered",
        items: [],
        onIncluirForaDeExercicio: () => {},
        total: 0,
      });

      // Assert
      expect(html).toContain("em exercício");
      expect(html).toContain("Buscar também fora de exercício");
      expect(html).toContain("Limpar busca e filtros");
    });

    it("mantém o estado vazio simples quando o recorte já foi ampliado", () => {
      // Arrange / Act
      const html = render(undefined, {
        display: "empty-filtered",
        items: [],
        total: 0,
      });

      // Assert
      expect(html).not.toContain("Buscar também fora de exercício");
      expect(html).toContain("Limpar busca e filtros");
    });
  });
});
