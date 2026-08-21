import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProposicoesSection } from "../components/home-proposicoes";

function renderSection(): string {
  return renderToStaticMarkup(createElement(ProposicoesSection, null, null));
}

describe("entrada de propostas na home", () => {
  describe("busca por assunto", () => {
    it("referencia a busca em vez de embutir um segundo campo na home", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).not.toContain("<form");
      expect(html).not.toContain('name="q"');
    });

    it("demonstra o tipo de termo aceito pelos exemplos", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain("Porte de arma");
    });

    it("não anuncia que entende linguagem comum", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).not.toContain("linguagem comum");
    });
  });

  describe("termos de exemplo", () => {
    it("dispara a busca ao ser clicado", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain('href="/proposicoes?q=porte+de+arma"');
    });
  });

  describe("caminho para a lista completa", () => {
    it("oferece a lista completa depois das propostas em destaque", () => {
      // Arrange
      const html = renderToStaticMarkup(
        createElement(
          ProposicoesSection,
          null,
          createElement("p", null, "destaques-da-home"),
        ),
      );

      // Act
      const destaques = html.indexOf("destaques-da-home");
      const listaCompleta = html.indexOf("Ver todas as propostas");

      // Assert
      expect(destaques).toBeGreaterThan(-1);
      expect(listaCompleta).toBeGreaterThan(destaques);
    });
  });

  describe("vocabulário da interface", () => {
    it("chama proposição de proposta na tela", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain("proposta");
      expect(html).not.toContain("proposição");
    });
  });
});
