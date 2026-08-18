import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoPartidoControl } from "../deputado-partido-control";

function render(
  selecionados: readonly string[],
  partidos = [{ siglaPartido: "PT" }],
): string {
  return renderToStaticMarkup(
    createElement(DeputadoPartidoControl, {
      onToggle: () => {},
      partidos,
      selecionados,
    }),
  );
}

describe("DeputadoPartidoControl", () => {
  describe("when listing the available partidos", () => {
    it("shows every sigla under a labelled group", () => {
      // Act
      const html = render(
        [],
        [{ siglaPartido: "PT" }, { siglaPartido: "PSOL" }],
      );

      // Assert
      expect(html).toContain("PT");
      expect(html).toContain("PSOL");
      expect(html).toContain("Filtrar por partido");
      expect(html).toContain('role="group"');
    });
  });

  describe("when one partido is selected", () => {
    it("marks only that option as pressed", () => {
      // Act
      const html = render(
        ["PT"],
        [{ siglaPartido: "PT" }, { siglaPartido: "PSOL" }],
      );

      // Assert
      const pressed = html.match(/aria-pressed="true"/g) ?? [];
      expect(pressed).toHaveLength(1);
      expect(html).toMatch(/aria-pressed="true"[^>]*>PT</);
    });
  });

  describe("when several partidos are selected", () => {
    it("marks every selected option as pressed", () => {
      // Act
      const html = render(
        ["PT", "PSOL"],
        [
          { siglaPartido: "PT" },
          { siglaPartido: "PSOL" },
          { siglaPartido: "PL" },
        ],
      );

      // Assert
      const pressed = html.match(/aria-pressed="true"/g) ?? [];
      expect(pressed).toHaveLength(2);
    });
  });

  describe("when no partido is available", () => {
    it("renders nothing", () => {
      // Act
      const html = render([], []);

      // Assert
      expect(html).toBe("");
    });
  });
});
