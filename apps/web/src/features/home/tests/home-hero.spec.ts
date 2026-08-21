import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeHero } from "../components/home-hero";

function render(): string {
  return renderToStaticMarkup(createElement(HomeHero));
}

describe("abertura da home", () => {
  describe("hierarquia de ações", () => {
    it("mantém a comparação como única ação primária", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html.match(/bg-primary(?![-a-z])/g) ?? []).toHaveLength(1);
      expect(html).toContain('href="/matcher"');
    });

    it("abre deputados como segunda porta", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain('href="/deputados"');
    });
  });

  describe("âncora do hero", () => {
    it("mostra como o resultado aparece antes de pedir a comparação", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain("Como o resultado aparece");
      expect(html).toContain("Exemplo");
    });

    it("não esconde o exemplo das telas pequenas", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).not.toContain("hidden lg:block");
    });
  });

  describe("origem dos dados", () => {
    it("diz de onde vêm os dados e liga à conta", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain("dados abertos da Câmara");
      expect(html).toContain('href="/metodologia"');
    });
  });
});
