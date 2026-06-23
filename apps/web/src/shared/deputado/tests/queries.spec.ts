import type {
  DeputadoPerfil,
  DeputadosFeedResponse,
  PartidosDisponiveisResponse,
} from "@vota-comigo/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "../../lib/api-client";
import { feed, partidosDisponiveis, perfil } from "../queries";

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
  legislaturaInicialPeriodo: null,
  legislaturaFinalPeriodo: null,
  resumoPresencaDisponivel: false,
  resumoPresenca: null,
  historicoPartidarioDisponivel: false,
  historicoPartidario: [],
};

const feedResponse: DeputadosFeedResponse = {
  items: [
    {
      externalIdDeputado: 220593,
      nomePublico: "Maria da Silva",
      nomeCivil: "Maria Aparecida da Silva",
      siglaPartido: "PT",
      siglaUf: "SP",
      urlFoto: "https://example.com/foto.jpg",
      emAtividade: true,
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
};

const partidosResponse: PartidosDisponiveisResponse = {
  items: [{ siglaPartido: "PSOL" }, { siglaPartido: "PT" }],
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

describe("feed", () => {
  describe("when filters are provided", () => {
    it("builds the deputado feed query string", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => feedResponse,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      const result = await feed(20, 40, "maria silva", true, "SP", "PT");

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/deputados/feed?limit=20&offset=40&q=maria%20silva&emAtividade=true&uf=SP&partido=PT",
      );
      expect(result.items[0].externalIdDeputado).toBe(220593);
    });
  });
});

describe("partidosDisponiveis", () => {
  describe("when the request succeeds", () => {
    it("fetches available partidos for the deputado feed", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => partidosResponse,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      const result = await partidosDisponiveis();

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/deputados/feed/partidos",
      );
      expect(result).toEqual(partidosResponse);
    });
  });
});
