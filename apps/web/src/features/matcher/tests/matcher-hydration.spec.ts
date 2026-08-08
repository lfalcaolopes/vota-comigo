import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  MatcherHydrationGate,
  MatcherProvider,
} from "../components/matcher-provider";

describe("Retomada do matcher", () => {
  describe("antes de ler o rascunho da aba", () => {
    it("exibe um estado neutro sem revelar o primeiro passo", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(
          MatcherProvider,
          null,
          createElement(
            MatcherHydrationGate,
            null,
            createElement("p", null, "Onde você vota"),
          ),
        ),
      );

      // Assert
      expect(html).toContain('role="status"');
      expect(html).toContain("Recuperando suas escolhas desta aba");
      expect(html).toContain("animate-skeleton");
      expect(html).not.toContain("Onde você vota");
    });
  });
});
