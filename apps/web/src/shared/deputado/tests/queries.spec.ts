import type {
  DeputadoCeapResponse,
  DeputadoDiscursosResponse,
  DeputadoPerfil,
  DeputadoOrgaosResponse,
  DeputadoProposicoesAssinadasResponse,
  DeputadosFeedResponse,
  PartidosDisponiveisResponse,
} from "@vota-comigo/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "../../lib/api-client";
import {
  ceap,
  comparativoDeputados,
  discursos,
  feed,
  orgaos,
  partidosDisponiveis,
  perfil,
  proposicoesAssinadas,
} from "../queries";

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
  defaultYear: null,
  validYearRange: null,
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

const orgaosResponse: DeputadoOrgaosResponse = {
  year: 2022,
  items: [],
  total: 0,
};

const proposicoesAssinadasResponse: DeputadoProposicoesAssinadasResponse = {
  year: 2022,
  disponivel: true,
  total: 0,
  totalPrimeiroSignatario: 0,
  coveredThroughDate: "2026-08-13",
};

const discursosResponse: DeputadoDiscursosResponse = {
  year: 2022,
  items: [],
  total: 0,
};

const ceapResponse: DeputadoCeapResponse = {
  year: 2022,
  availableYears: [2024, 2023, 2022],
  status: "ano-nao-carregado",
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

describe("orgaos", () => {
  describe("when the request succeeds", () => {
    it("fetches the selected year through the product API", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => orgaosResponse,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      const result = await orgaos(74646, 2022);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/deputados/74646/orgaos?year=2022",
      );
      expect(result).toEqual(orgaosResponse);
    });
  });
});

describe("discursos", () => {
  describe("when the request succeeds", () => {
    it("fetches the selected year through the product API", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => discursosResponse,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      const result = await discursos(74646, 2022);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/deputados/74646/discursos?year=2022",
      );
      expect(result).toEqual(discursosResponse);
    });
  });
});

describe("proposicoesAssinadas", () => {
  describe("when the request succeeds", () => {
    it("fetches the selected year through the product API", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => proposicoesAssinadasResponse,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      const result = await proposicoesAssinadas(74646, 2022);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/deputados/74646/proposicoes-assinadas?year=2022",
      );
      expect(result).toEqual(proposicoesAssinadasResponse);
    });
  });
});

describe("ceap", () => {
  describe("when the request succeeds", () => {
    it("fetches the selected year through the product API", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => ceapResponse,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      const result = await ceap(74646, 2022);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/deputados/74646/ceap?year=2022",
      );
      expect(result).toEqual(ceapResponse);
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

describe("comparativoDeputados", () => {
  describe("when the request succeeds", () => {
    it("fetches the compared deputados through the product API", async () => {
      // Arrange
      const comparativoResponse = {
        janelasCoincidem: true,
        items: [],
      };
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => comparativoResponse,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      const result = await comparativoDeputados([74646, 220593]);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/comparativo-deputados?ids=74646,220593",
      );
      expect(result).toEqual(comparativoResponse);
    });
  });
});
