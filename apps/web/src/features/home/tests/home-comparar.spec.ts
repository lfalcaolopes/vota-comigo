import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeComparar } from "../components/home-comparar";

function render(): string {
  return renderToStaticMarkup(createElement(HomeComparar));
}

describe("fechamento da home", () => {
  describe("comparação pelas posições", () => {
    it("leva ao fluxo de comparação", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain('href="/matcher"');
    });

    it("é a única ação com peso de botão primário no fecho", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html.match(/bg-primary(?![-a-z])/g) ?? []).toHaveLength(1);
    });

    it("não repete a explicação que o hero e as propostas já deram", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).not.toContain("quem votou como você");
    });
  });

  describe("comparação entre deputados", () => {
    it("nomeia o segundo modo de comparar", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain("Entre deputados");
    });

    it("não promete votos, que o comparativo entre deputados não mostra", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).not.toContain("votos");
    });

    it("manda para a lista onde a escolha acontece", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain('href="/deputados"');
    });
  });
});
