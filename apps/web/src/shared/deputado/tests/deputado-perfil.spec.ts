import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DeputadoPerfil as DeputadoPerfilData } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { DeputadoPerfil } from "../deputado-perfil";

function makePerfil(
  overrides: Partial<DeputadoPerfilData> = {},
): DeputadoPerfilData {
  return {
    externalIdDeputado: 220593,
    nomePublico: "Maria da Silva",
    nomeCivil: "Maria Aparecida da Silva",
    fonteOficial: "https://www.camara.leg.br/deputados/220593",
    historicoParlamentarDisponivel: true,
    ...overrides,
  };
}

function render(perfil: DeputadoPerfilData): string {
  return renderToStaticMarkup(createElement(DeputadoPerfil, { perfil }));
}

describe("DeputadoPerfil", () => {
  describe("dados cadastrais basicos", () => {
    it("shows the public name, the cargo and the official source link", () => {
      // Arrange
      const perfil = makePerfil();

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("Maria da Silva");
      expect(html).toContain("Deputado federal");
      expect(html).toContain("Ver fonte oficial na Câmara");
      expect(html).toContain("https://www.camara.leg.br/deputados/220593");
    });

    it("shows the nome civil as secondary metadata when it differs from the public name", () => {
      // Arrange
      const perfil = makePerfil();

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("Maria Aparecida da Silva");
    });

    it("omits the nome civil when it matches the public name", () => {
      // Arrange
      const perfil = makePerfil({
        nomePublico: "Maria da Silva",
        nomeCivil: "Maria da Silva",
      });

      // Act
      const html = render(perfil);

      // Assert
      expect(html.match(/Maria da Silva/g)).toHaveLength(1);
    });
  });

  describe("lacuna de historico parlamentar", () => {
    it("shows a gap message for history-dependent data when the deputado has no history", () => {
      // Arrange
      const perfil = makePerfil({ historicoParlamentarDisponivel: false });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("histórico parlamentar");
    });

    it("does not show the gap message when the deputado has history", () => {
      // Arrange
      const perfil = makePerfil({ historicoParlamentarDisponivel: true });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).not.toContain("Sem histórico parlamentar");
    });
  });
});
