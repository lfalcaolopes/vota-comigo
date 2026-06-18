import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoUfControl } from "../deputado-uf-control";

function render(activeUf: string | null): string {
  return renderToStaticMarkup(
    createElement(DeputadoUfControl, {
      activeUf,
      onSelect: () => {},
      ufs: [{ siglaUf: "SP" }, { siglaUf: "RJ" }],
    }),
  );
}

describe("DeputadoUfControl", () => {
  describe("when no estado is selected", () => {
    it("renders the filter trigger as estado", () => {
      // Act
      const html = render(null);

      // Assert
      expect(html).toContain("Estado");
    });
  });

  describe("when an estado is selected", () => {
    it("shows the estado name instead of the UF code", () => {
      // Act
      const html = render("SP");

      // Assert
      expect(html).toContain("São Paulo");
      expect(html).toContain("Limpar filtro de estado São Paulo");
      expect(html).not.toContain(">SP<");
    });
  });
});
