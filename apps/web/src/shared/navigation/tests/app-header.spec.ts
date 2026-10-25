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

  describe("durante a apuração", () => {
    it("leva à projeção ao vivo pela navegação principal", () => {
      // Act
      const html = render("/");

      // Assert
      expect(html).toContain('href="/laboratorio/apuracao"');
      expect(html).toContain("ao vivo");
    });

    it("marca o item como página atual na projeção", () => {
      // Act
      const html = render("/laboratorio/apuracao");

      // Assert
      expect(html).toMatch(
        /aria-current="page"[^>]*href="\/laboratorio\/apuracao"|href="\/laboratorio\/apuracao"[^>]*aria-current="page"/,
      );
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
