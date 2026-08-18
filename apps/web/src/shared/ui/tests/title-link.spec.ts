import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TitleLink } from "../title-link";

describe("TitleLink", () => {
  describe("quando um título leva a outra página", () => {
    it("abre em nova aba e anuncia isso para leitores de tela", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(TitleLink, { href: "/deputados/1" }, "Fulano de Tal"),
      );

      // Assert
      expect(html).toContain('href="/deputados/1"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain("Fulano de Tal");
      expect(html).toContain("abre em nova aba");
    });

    it("mostra o sublinhado antes de qualquer interação", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(TitleLink, { href: "/proposicoes/9" }, "PL 1234/2023"),
      );

      // Assert
      expect(html).toContain("underline");
      expect(html).not.toContain("decoration-transparent");
    });

    it("aceita a escala tipográfica de quem chama", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(
          TitleLink,
          { className: "text-base font-[680]", href: "/proposicoes/9" },
          "PL 1234/2023",
        ),
      );

      // Assert
      expect(html).toContain("text-base font-[680]");
    });
  });
});
