import type { DeputadoFaixaEtaria } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoFaixaEtariaControl } from "../deputado-faixa-etaria-control";

function render(selecionadas: readonly DeputadoFaixaEtaria[]): string {
  return renderToStaticMarkup(
    createElement(DeputadoFaixaEtariaControl, {
      onToggle: () => {},
      selecionadas,
    }),
  );
}

describe("DeputadoFaixaEtariaControl", () => {
  describe("when listing the faixas", () => {
    it("covers every age with an open range at each end", () => {
      // Act
      const html = render([]);

      // Assert
      expect(html).toContain("Até 39 anos");
      expect(html).toContain("40 a 49 anos");
      expect(html).toContain("50 a 59 anos");
      expect(html).toContain("60 a 69 anos");
      expect(html).toContain("70 anos ou mais");
    });

    it("groups the options under a labelled group", () => {
      // Act
      const html = render([]);

      // Assert
      expect(html).toContain("Filtrar por faixa etária");
      expect(html).toContain('role="group"');
    });
  });

  describe("when several faixas are selected", () => {
    it("marks every selected faixa as pressed", () => {
      // Act
      const html = render(["40-49", "70-mais"]);

      // Assert
      const pressed = html.match(/aria-pressed="true"/g) ?? [];
      expect(pressed).toHaveLength(2);
      expect(html).toMatch(/aria-pressed="true"[^>]*>40 a 49 anos</);
      expect(html).toMatch(/aria-pressed="true"[^>]*>70 anos ou mais</);
    });
  });
});
