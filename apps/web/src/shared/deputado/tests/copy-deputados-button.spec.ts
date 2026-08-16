import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CopyDeputadosButton } from "../copy-deputados-button";

const DEPUTADOS = [
  {
    externalIdDeputado: 204521,
    nome: "Fulana de Tal",
    siglaPartido: "PT",
    siglaUf: "SP",
    compatibilidade: null,
  },
];

function render(contexto: string | null = null): string {
  return renderToStaticMarkup(
    createElement(CopyDeputadosButton, { deputados: DEPUTADOS, contexto }),
  );
}

describe("CopyDeputadosButton", () => {
  describe("when the page loads", () => {
    it("offers the copy gesture as a button", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain("Copiar em texto");
      expect(html).toContain('type="button"');
    });

    it("keeps a polite live region ready so the confirmation is announced", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
    });

    it("does not announce a copy that has not happened", () => {
      // Act
      const html = render();

      // Assert
      expect(html).not.toContain("Copiado");
    });

    it("keeps the manual fallback closed until the copy fails", () => {
      // Act
      const html = render();

      // Assert
      expect(html).not.toContain("textarea");
      expect(html).toContain('aria-expanded="false"');
    });
  });
});
