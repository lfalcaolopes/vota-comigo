import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Matcher } from "../components/matcher";

describe("Retomada do matcher", () => {
  describe("antes de ler o rascunho da aba", () => {
    it("exibe um estado neutro sem revelar o primeiro passo", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(Matcher, {
          initialProposicoes: [],
          initialTotal: 0,
          temas: [],
        }),
      );

      // Assert
      expect(html).toContain('role="status"');
      expect(html).toContain("Recuperando suas escolhas desta aba");
      expect(html).toContain("animate-skeleton");
      expect(html).not.toContain("Onde você vota");
    });
  });
});
