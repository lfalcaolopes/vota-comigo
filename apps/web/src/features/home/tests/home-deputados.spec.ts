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
    it("convida a abrir o perfil e diz o que ele mostra", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain("Abra o perfil");
      expect(html).toContain("presença");
      expect(html).toContain("propostas assinadas");
      expect(html).toContain("comissões");
      expect(html).toContain("uso da cota parlamentar");
    });
  });

  describe("recorte da amostra", () => {
    it("nomeia no título quem representa o estado identificado", () => {
      // Arrange / Act
      const html = renderSection("PE");

      // Assert
      expect(html).toContain("Quem representa Pernambuco na Câmara");
      expect(html).not.toContain("Deputados de todo o Brasil");
    });

    it("diz que o recorte é nacional e pede o estado quando não há um identificado", () => {
      // Arrange / Act
      const html = renderSection(null);

      // Assert
      expect(html).toContain("Quem representa o seu estado na Câmara");
      expect(html).toContain("Deputados de todo o Brasil");
      expect(html).toContain("Escolha seu estado:");
    });

    it("oferece outros estados sem repetir o identificado", () => {
      // Arrange / Act
      const html = renderSection("SP");

      // Assert
      expect(html).toContain("Ver outro estado:");
      expect(html).not.toContain('href="/deputados?uf=SP"');
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

    it("leva de todos os estados para a lista sem filtro de estado", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toMatch(
        /<a[^>]*href="\/deputados"[^>]*>Todos os estados<\/a>/,
      );
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
    it("deixa a lista completa para o chip e o fecho da home, sem link depois da amostra", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(
          DeputadosSection,
          { siglaUf: null },
          createElement("p", null, "amostra-da-home"),
        ),
      );

      // Assert
      expect(html).toContain("amostra-da-home");
      expect(html).not.toContain("Ver todos os deputados");
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
