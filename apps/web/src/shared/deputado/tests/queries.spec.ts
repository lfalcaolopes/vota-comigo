import type { DeputadoPerfil } from "@vota-comigo/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "../../lib/api-client";
import { perfil } from "../queries";

const response: DeputadoPerfil = {
  externalIdDeputado: 220593,
  nomePublico: "Maria da Silva",
  nomeCivil: "Maria Aparecida da Silva",
  fonteOficial: "https://www.camara.leg.br/deputados/220593",
  historicoParlamentarDisponivel: true,
  snapshotPublicoDisponivel: false,
  snapshotPublico: null,
  emAtividade: true,
  redesSociais: [],
  dataNascimento: null,
  municipioNascimento: null,
  ufNascimento: null,
  externalIdLegislaturaInicial: null,
  externalIdLegislaturaFinal: null,
  resumoPresencaDisponivel: false,
  resumoPresenca: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("perfil", () => {
  describe("when the request succeeds", () => {
    it("fetches the perfil for the externalIdDeputado", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => response,
      });
      vi.stubGlobal("fetch", fetchMock);

      // Act
      const result = await perfil(220593);

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3001/deputados/220593",
      );
      expect(result).toEqual(response);
    });
  });

  describe("when the deputado does not exist", () => {
    it("raises a NotFoundError", async () => {
      // Arrange
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => ({}) }),
      );

      // Act / Assert
      await expect(perfil(999)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
