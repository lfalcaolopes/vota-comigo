import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AppHeader } from "../app-header";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

function render(pathname: string): string {
  navigation.pathname = pathname;
  return renderToStaticMarkup(createElement(AppHeader));
}

describe("cabeçalho da aplicação", () => {
  describe("fora do fluxo de comparação", () => {
    it("oferece o acesso para fazer uma comparação", () => {
      // Act
      const html = render("/deputados");

      // Assert
      expect(html).toContain("Fazer comparação");
    });
  });

  describe("dentro do matcher", () => {
    it("remove o CTA global", () => {
      // Act
      const html = render("/matcher");

      // Assert
      expect(html).not.toContain("Fazer comparação");
    });
  });

  describe("dentro do comparativo de deputados", () => {
    it("remove o CTA global", () => {
      // Act
      const html = render("/deputados/comparativo/1,2");

      // Assert
      expect(html).not.toContain("Fazer comparação");
    });
  });
});
