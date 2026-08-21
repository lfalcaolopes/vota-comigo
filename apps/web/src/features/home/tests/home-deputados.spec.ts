import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AmostraList, DeputadosSection } from "../components/home-deputados";

function renderSection(
  total: number | null = 513,
  siglaUf: string | null = null,
): string {
  return renderToStaticMarkup(
    createElement(DeputadosSection, { siglaUf, total }, null),
  );
}

describe("entrada de deputados na home", () => {
  describe("tamanho da Câmara", () => {
    it("conta os deputados a partir do dado, não de um número cravado", () => {
      // Arrange / Act
      const html = renderSection(511);

      // Assert
      expect(html).toContain("511 deputados");
      expect(html).not.toContain("513");
    });

    it("omite a contagem quando a lista não pôde ser carregada", () => {
      // Arrange / Act
      const html = renderSection(null);

      // Assert
      expect(html).toContain("deputados em exercício");
      expect(html).not.toMatch(/\d{3} deputados/);
    });
  });

  describe("recorte da amostra", () => {
    it("nomeia o estado dos deputados que está mostrando", () => {
      // Arrange / Act
      const html = renderSection(513, "PE");

      // Assert
      expect(html).toContain("Deputados de Pernambuco");
    });

    it("diz que o recorte é nacional quando não há estado identificado", () => {
      // Arrange / Act
      const html = renderSection(513, null);

      // Assert
      expect(html).toContain("Deputados de todo o Brasil");
    });

    it("não explica de onde veio o estado", () => {
      // Arrange / Act
      const html = renderSection(513, "SP");

      // Assert
      expect(html).not.toContain("acesso");
      expect(html).not.toContain("ordem alfabética");
    });
  });

  describe("caminho por estado", () => {
    it("leva para a lista já filtrada pelo estado do chip", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain('href="/deputados?uf=SP"');
    });

    it("não embute um segundo campo de busca na home", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).not.toContain("<form");
      expect(html).not.toContain('name="q"');
    });
  });

  describe("caminho para a lista completa", () => {
    it("oferece a lista completa depois da amostra", () => {
      // Arrange
      const html = renderToStaticMarkup(
        createElement(
          DeputadosSection,
          { siglaUf: null, total: 513 },
          createElement("p", null, "amostra-da-home"),
        ),
      );

      // Act
      const amostra = html.indexOf("amostra-da-home");
      const listaCompleta = html.indexOf("Ver todos os deputados");

      // Assert
      expect(amostra).toBeGreaterThan(-1);
      expect(listaCompleta).toBeGreaterThan(amostra);
    });
  });

  describe("amostra sem deputados", () => {
    it("explica a ausência em vez de deixar a lista muda", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(AmostraList, { items: [] }),
      );

      // Assert
      expect(html).toContain("Nenhum deputado para mostrar agora");
    });
  });

  describe("vocabulário da interface", () => {
    it("chama proposição de proposta na tela", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain("propostas");
      expect(html).not.toContain("proposição");
    });
  });
});
