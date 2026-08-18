import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StepIndicator } from "../components/flow/step-indicator";

describe("matcher step indicator", () => {
  describe("when an earlier step is complete", () => {
    it("renders it as a route link", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(StepIndicator, {
          currentRoute: "/matcher/posicoes",
        }),
      );

      // Assert
      expect(html).toContain('href="/matcher/local"');
      expect(html).toContain('href="/matcher/proposicoes"');
      expect(html).not.toContain("<button");
    });
  });
});
