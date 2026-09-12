import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AmostraList, DeputadosSection } from "../components/home-deputados";

function renderSection(siglaUf: string | null = null): string {
  return renderToStaticMarkup(
    createElement(DeputadosSection, { siglaUf }, null),
  );
}

describe("entrada de deputados na home", () => {
  describe("papel na narrativa", () => {
    it("apresenta os dados disponíveis além dos votos", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain("Conheça os deputados além dos votos");
      expect(html).toContain("presença");
      expect(html).toContain("propostas assinadas");
      expect(html).toContain("comissões");
      expect(html).toContain("uso da cota parlamentar");
    });
  });

  describe("recorte da amostra", () => {
    it("nomeia o estado dos deputados que está mostrando", () => {
      // Arrange / Act
      const html = renderSection("PE");

      // Assert
      expect(html).toContain("Deputados de Pernambuco");
    });

    it("diz que o recorte é nacional quando não há estado identificado", () => {
      // Arrange / Act
      const html = renderSection(null);

      // Assert
      expect(html).toContain("Deputados de todo o Brasil");
    });

    it("não explica de onde veio o estado", () => {
      // Arrange / Act
      const html = renderSection("SP");

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

    it("leva de Outros para a lista sem filtro de estado", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toMatch(/<a[^>]*href="\/deputados"[^>]*>Outros<\/a>/);
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
          { siglaUf: null },
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
