import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeComparar } from "../components/home-comparar";

function render(): string {
  return renderToStaticMarkup(createElement(HomeComparar));
}

describe("fechamento da home", () => {
  describe("convite final", () => {
    it("convida a comparar antes da escolha", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain("Compare antes de escolher");
    });
  });

  describe("comparação pelas posições", () => {
    it("leva ao fluxo de comparação", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain('href="/matcher"');
    });

    it("é a única ação com peso de botão primário no fecho", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html.match(/bg-primary(?![-a-z])/g) ?? []).toHaveLength(1);
    });

    it("não repete a explicação que o hero e as propostas já deram", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).not.toContain("quem votou como você");
    });

    it("lembra o resultado que o hero mostrou como exemplo", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain("as votações que entraram na conta");
    });
  });

  describe("caminho para os perfis", () => {
    it("fica abaixo da comparação, como caminho secundário", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html.indexOf('href="/deputados"')).toBeGreaterThan(
        html.indexOf('href="/matcher"'),
      );
      expect(html).toContain("Ver perfis dos deputados");
    });

    it("não promete votos no convite aos perfis", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).not.toContain("votos");
    });

    it("não repete a ficha que a seção de deputados acabou de enumerar", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).not.toContain("presença");
      expect(html).not.toContain("comissões");
    });

    it("manda para a lista onde a escolha acontece", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain('href="/deputados"');
    });
  });
});
