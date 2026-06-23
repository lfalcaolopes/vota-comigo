import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoPerfilSkeleton } from "../deputado-perfil-skeleton";

function render(): string {
  return renderToStaticMarkup(createElement(DeputadoPerfilSkeleton));
}

describe("DeputadoPerfilSkeleton", () => {
  describe("acessibilidade", () => {
    it("announces a loading status to assistive tech", () => {
      // Arrange + Act
      const html = render();

      // Assert
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Carregando perfil do deputado"');
    });

    it("hides the decorative placeholders from the accessibility tree", () => {
      // Arrange + Act
      const html = render();

      // Assert
      expect(html).toContain('aria-hidden="true"');
    });
  });
});
