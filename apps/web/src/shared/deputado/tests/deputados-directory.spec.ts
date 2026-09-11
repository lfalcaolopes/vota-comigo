import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadosDirectory } from "../deputados-directory";

const deputados = [
  { externalIdDeputado: 220593, nomePublico: "Maria da Silva", siglaUf: "SP" },
  { externalIdDeputado: 204521, nomePublico: "Joao Souza", siglaUf: "SP" },
  { externalIdDeputado: 178901, nomePublico: "Ana Lima", siglaUf: "BA" },
];

function render(
  items: readonly (typeof deputados)[number][] = deputados,
): string {
  return renderToStaticMarkup(
    createElement(DeputadosDirectory, { deputados: items }),
  );
}

describe("DeputadosDirectory", () => {
  describe("when listing every available profile", () => {
    it("links to each deputado profile", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain('href="/deputados/220593-maria-da-silva"');
      expect(html).toContain('href="/deputados/204521-joao-souza"');
      expect(html).toContain('href="/deputados/178901-ana-lima"');
    });

    it("groups the profiles by state with the group size", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain("SP (2)");
      expect(html).toContain("BA (1)");
    });

    it("does not render a heading of its own", () => {
      // Act
      const html = render();

      // Assert
      expect(html).not.toMatch(/<h[1-6]/);
    });
  });

  describe("when the source data is incomplete", () => {
    it("falls back to explicit labels for missing state and name", () => {
      // Act
      const html = render([
        { externalIdDeputado: 111111, nomePublico: null, siglaUf: null },
      ]);

      // Assert
      expect(html).toContain("UF não informada (1)");
      expect(html).toContain("Nome não informado");
    });
  });
});
