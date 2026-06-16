import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DeputadoPerfil as DeputadoPerfilData } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { DeputadoBreadcrumb } from "../deputado-breadcrumb";

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
  return renderToStaticMarkup(createElement(DeputadoBreadcrumb, { perfil }));
}

describe("DeputadoBreadcrumb", () => {
  describe("when the perfil has a public name", () => {
    it("links Início to the home and shows the public name", () => {
      // Arrange
      const perfil = makePerfil();

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("Início");
      expect(html).toContain('href="/"');
      expect(html).toContain("Maria da Silva");
    });
  });
});
