import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppFooter } from "../app-footer";

describe("rodapé da aplicação", () => {
  describe("na identificação do projeto", () => {
    it("exibe o copyright com o ano corrente", () => {
      // Act
      const html = renderToStaticMarkup(createElement(AppFooter));

      // Assert
      expect(html).toContain(`© ${new Date().getFullYear()} Quem Vota Comigo`);
    });
  });

  describe("na seção Navegar", () => {
    it("oferece acesso ao diretório completo de deputados", () => {
      // Act
      const html = renderToStaticMarkup(createElement(AppFooter));

      // Assert
      expect(html).toContain('href="/deputados/diretorio"');
    });
  });

  describe("na seção Entender", () => {
    it("oferece acesso à metodologia e à privacidade", () => {
      // Act
      const html = renderToStaticMarkup(createElement(AppFooter));

      // Assert
      expect(html).toContain('href="/metodologia"');
      expect(html).toContain('href="/privacidade"');
    });
  });
});
