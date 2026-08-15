import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoUfControl } from "../deputado-uf-control";

function render(activeUf: string | null, ufs = [{ siglaUf: "SP" }]): string {
  return renderToStaticMarkup(
    createElement(DeputadoUfControl, {
      activeUf,
      onChange: () => {},
      ufs,
    }),
  );
}

describe("DeputadoUfControl", () => {
  describe("when listing the available estados", () => {
    it("names each estado instead of its UF code", () => {
      // Act
      const html = render(null, [{ siglaUf: "SP" }, { siglaUf: "RJ" }]);

      // Assert
      expect(html).toContain("São Paulo");
      expect(html).toContain("Rio de Janeiro");
      expect(html).not.toContain(">SP<");
    });

    it("groups the options under a labelled group", () => {
      // Act
      const html = render(null);

      // Assert
      expect(html).toContain("Filtrar por estado");
      expect(html).toContain('role="group"');
    });
  });

  describe("when an estado is selected", () => {
    it("marks only that option as pressed", () => {
      // Act
      const html = render("SP", [{ siglaUf: "SP" }, { siglaUf: "RJ" }]);

      // Assert
      const pressed = html.match(/aria-pressed="true"/g) ?? [];
      expect(pressed).toHaveLength(1);
      expect(html).toMatch(/aria-pressed="true"[^>]*>São Paulo</);
    });
  });

  describe("when no estado is available", () => {
    it("renders nothing", () => {
      // Act
      const html = render(null, []);

      // Assert
      expect(html).toBe("");
    });
  });
});
