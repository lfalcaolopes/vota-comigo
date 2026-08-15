import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoPartidoControl } from "../deputado-partido-control";

function render(
  activePartido: string | null,
  partidos = [{ siglaPartido: "PT" }],
): string {
  return renderToStaticMarkup(
    createElement(DeputadoPartidoControl, {
      activePartido,
      onChange: () => {},
      partidos,
    }),
  );
}

describe("DeputadoPartidoControl", () => {
  describe("when listing the available partidos", () => {
    it("shows every sigla under a labelled group", () => {
      // Act
      const html = render(null, [
        { siglaPartido: "PT" },
        { siglaPartido: "PSOL" },
      ]);

      // Assert
      expect(html).toContain("PT");
      expect(html).toContain("PSOL");
      expect(html).toContain("Filtrar por partido");
      expect(html).toContain('role="group"');
    });
  });

  describe("when a partido is selected", () => {
    it("marks only that option as pressed", () => {
      // Act
      const html = render("PT", [
        { siglaPartido: "PT" },
        { siglaPartido: "PSOL" },
      ]);

      // Assert
      const pressed = html.match(/aria-pressed="true"/g) ?? [];
      expect(pressed).toHaveLength(1);
      expect(html).toMatch(/aria-pressed="true"[^>]*>PT</);
    });
  });

  describe("when no partido is available", () => {
    it("renders nothing", () => {
      // Act
      const html = render(null, []);

      // Assert
      expect(html).toBe("");
    });
  });
});
