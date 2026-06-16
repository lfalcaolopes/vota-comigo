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
  });

  describe("when size is lg", () => {
    it("renders with the lg size class", () => {
      // Arrange / Act
      const html = render({ nome: "Maria da Silva", urlFoto: null, size: "lg" });

      // Assert
      expect(html).toContain("size-16");
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
