import type { DeputadoPerfil } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { nomePublicoLabel } from "../presentation";

function makePerfil(overrides: Partial<DeputadoPerfil> = {}): DeputadoPerfil {
  return {
    externalIdDeputado: 220593,
    nomePublico: "Maria da Silva",
    nomeCivil: "Maria Aparecida da Silva",
    fonteOficial: "https://www.camara.leg.br/deputados/220593",
    historicoParlamentarDisponivel: true,
    ...overrides,
  };
}

describe("nomePublicoLabel", () => {
  describe("when the perfil has a public name", () => {
    it("returns the public name", () => {
      // Act / Assert
      expect(nomePublicoLabel(makePerfil())).toBe("Maria da Silva");
    });
  });

  describe("when the perfil has no public name", () => {
    it("falls back to a generic deputado label", () => {
      // Act / Assert
      expect(nomePublicoLabel(makePerfil({ nomePublico: null }))).toBe(
        "Deputado federal",
      );
    });
  });
});
