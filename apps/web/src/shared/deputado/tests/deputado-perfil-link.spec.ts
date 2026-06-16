import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoPerfilLink } from "../deputado-perfil-link";

function render(externalIdDeputado: number): string {
  return renderToStaticMarkup(
    createElement(DeputadoPerfilLink, { externalIdDeputado }),
  );
}

describe("DeputadoPerfilLink", () => {
  describe("when rendering the entry point to the public profile", () => {
    it("links to the deputado profile route", () => {
      // Act
      const html = render(220593);

      // Assert
      expect(html).toContain('href="/deputados/220593"');
    });

    it("opens the profile in a new tab without leaking the opener", () => {
      // Act
      const html = render(220593);

      // Assert
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    it("exposes an accessible label that does not depend on color", () => {
      // Act
      const html = render(220593);

      // Assert
      expect(html).toContain("Ver perfil do deputado");
      expect(html).toMatch(/aria-label="[^"]+"/);
    });
  });
});
