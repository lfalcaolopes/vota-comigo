import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoPartidoControl } from "../deputado-partido-control";

function render(activePartido: string | null): string {
  return renderToStaticMarkup(
    createElement(DeputadoPartidoControl, {
      activePartido,
      onSelect: () => {},
      partidos: [{ siglaPartido: "PSOL" }, { siglaPartido: "PT" }],
    }),
  );
}

describe("DeputadoPartidoControl", () => {
  describe("when no partido is selected", () => {
    it("renders the filter trigger as partido", () => {
      // Act
      const html = render(null);

      // Assert
      expect(html).toContain("Partido");
    });
  });

  describe("when a partido is selected", () => {
    it("shows the partido sigla", () => {
      // Act
      const html = render("PT");

      // Assert
      expect(html).toContain(">PT<");
      expect(html).toContain("Limpar filtro de partido PT");
    });
  });
});
