import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoAvatar } from "../deputado-avatar";

function render(props: { nome: string | null; urlFoto: string | null; size?: "sm" | "lg" }): string {
  return renderToStaticMarkup(createElement(DeputadoAvatar, props));
}

describe("DeputadoAvatar", () => {
  describe("when urlFoto is provided", () => {
    it("renders an image with the provided src", () => {
      // Arrange / Act
      const html = render({
        nome: "Maria da Silva",
        urlFoto: "https://example.com/foto.jpg",
      });

      // Assert
      expect(html).toContain("example.com");
      expect(html).toContain("<img");
    });

    it("gives the image a descriptive alt derived from the nome", () => {
      // Arrange / Act
      const html = render({
        nome: "Maria da Silva",
        urlFoto: "https://example.com/foto.jpg",
      });

      // Assert
      expect(html).toContain('alt="Foto de Maria da Silva"');
    });

    it("falls back to a generic alt when nome is null", () => {
      // Arrange / Act
      const html = render({
        nome: null,
        urlFoto: "https://example.com/foto.jpg",
      });

      // Assert
      expect(html).toContain('alt="Foto do deputado"');
    });
  });

  describe("when urlFoto is null", () => {
    it("renders initials as fallback", () => {
      // Arrange / Act
      const html = render({ nome: "Maria da Silva", urlFoto: null });

      // Assert
      expect(html).toContain("MS");
      expect(html).not.toContain("<img");
    });

    it("renders ? when nome is also null", () => {
      // Arrange / Act
      const html = render({ nome: null, urlFoto: null });

      // Assert
      expect(html).toContain("?");
    });

    it("exposes the identity to assistive tech instead of hiding the initials", () => {
      // Arrange / Act
      const html = render({ nome: "Maria da Silva", urlFoto: null });

      // Assert
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="Maria da Silva"');
      expect(html).not.toContain('aria-hidden="true"');
    });

    it("labels the initials fallback generically when nome is null", () => {
      // Arrange / Act
      const html = render({ nome: null, urlFoto: null });

      // Assert
      expect(html).toContain('aria-label="Deputado federal"');
    });
  });

  describe("when size is lg", () => {
    it("scales down on small viewports and up on larger ones", () => {
      // Arrange / Act
      const html = render({ nome: "Maria da Silva", urlFoto: null, size: "lg" });

      // Assert
      expect(html).toContain("size-14");
      expect(html).toContain("md:size-16");
    });
  });

  describe("when size is sm or unspecified", () => {
    it("renders with the default sm size class", () => {
      // Arrange / Act
      const html = render({ nome: "Maria da Silva", urlFoto: null });

      // Assert
      expect(html).toContain("size-10");
    });
  });
});
