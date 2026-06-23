import type { DeputadoCard } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoRow } from "../deputado-row";

const card: DeputadoCard = {
  externalIdDeputado: 220593,
  nomePublico: "Maria da Silva",
  nomeCivil: "Maria Aparecida da Silva",
  siglaPartido: "PT",
  siglaUf: "SP",
  urlFoto: null,
  emAtividade: true,
};

function render(overrides: Partial<DeputadoCard> = {}): string {
  return renderToStaticMarkup(
    createElement(DeputadoRow, {
      card: { ...card, ...overrides },
      href: `/deputados/${card.externalIdDeputado}`,
    }),
  );
}

describe("DeputadoRow", () => {
  describe("when rendering a deputado card", () => {
    it("renders identity, public snapshot fields, activity, and profile link", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain('href="/deputados/220593"');
      expect(html).not.toContain('target="_blank"');
      expect(html).toContain("Maria da Silva");
      expect(html).toContain("PT");
      expect(html).toContain("SP");
      expect(html).toContain("Em atividade");
      expect(html).not.toContain("Nome civil");
    });
  });

  describe("when snapshot fields are missing", () => {
    it("renders explicit not-informed text", () => {
      // Arrange / Act
      const html = render({
        nomePublico: null,
        siglaPartido: null,
        siglaUf: null,
        emAtividade: false,
      });

      // Assert
      expect(html).toContain("Nome não informado");
      expect(html).toContain("Partido não informado");
      expect(html).toContain("UF não informada");
      expect(html).toContain("Fora de atividade");
    });
  });
});
