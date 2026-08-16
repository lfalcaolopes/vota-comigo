import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoUfControl } from "../deputado-uf-control";

function render(
  selecionados: readonly string[],
  ufs = [{ siglaUf: "SP" }],
): string {
  return renderToStaticMarkup(
    createElement(DeputadoUfControl, {
      onToggle: () => {},
      selecionados,
      ufs,
    }),
  );
}

describe("DeputadoUfControl", () => {
  describe("when listing the available estados", () => {
    it("names each estado instead of its UF code", () => {
      // Act
      const html = render([], [{ siglaUf: "SP" }, { siglaUf: "RJ" }]);

      // Assert
      expect(html).toContain("São Paulo");
      expect(html).toContain("Rio de Janeiro");
      expect(html).not.toContain(">SP<");
    });

    it("groups the options under a labelled group", () => {
      // Act
      const html = render([]);

      // Assert
      expect(html).toContain("Filtrar por estado");
      expect(html).toContain('role="group"');
    });
  });

  describe("when one estado is selected", () => {
    it("marks only that option as pressed", () => {
      // Act
      const html = render(["SP"], [{ siglaUf: "SP" }, { siglaUf: "RJ" }]);

      // Assert
      const pressed = html.match(/aria-pressed="true"/g) ?? [];
      expect(pressed).toHaveLength(1);
      expect(html).toMatch(/aria-pressed="true"[^>]*>São Paulo</);
    });
  });

  describe("when several estados are selected", () => {
    it("marks every selected option as pressed", () => {
      // Act
      const html = render(
        ["SP", "RJ"],
        [{ siglaUf: "SP" }, { siglaUf: "RJ" }, { siglaUf: "MG" }],
      );

      // Assert
      const pressed = html.match(/aria-pressed="true"/g) ?? [];
      expect(pressed).toHaveLength(2);
      expect(html).toMatch(/aria-pressed="false"[^>]*>Minas Gerais</);
    });
  });

  describe("when no estado is available", () => {
    it("renders nothing", () => {
      // Act
      const html = render([], []);

      // Assert
      expect(html).toBe("");
    });
  });
});
