import type {
  ProposicoesFeedResponse,
  ProposicaoDetalhe,
  TemasDisponiveisResponse,
} from "@vota-comigo/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, NotFoundError } from "../../lib/api-client";
import { detalhe, feed, temasDisponiveis } from "../queries";

const response: ProposicoesFeedResponse = {
  items: [
    {
      externalIdProposicao: 42,
      siglaTipo: "PL",
      numero: 1234,
      ano: 2023,
      ementa: "Dispõe sobre alguma coisa.",
      dataApresentacao: "2023-05-10",
      volumeVotacoesPlenario: 9,
      dataUltimaVotacao: "2025-03-14",
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("feed", () => {
  describe("when the request succeeds", () => {
    it("returns the typed items from the response wrapper", async () => {
      // Arrange
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => response,
        }),
      );

      // Act
      const result = await feed(20, 0);

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].externalIdProposicao).toBe(42);
      expect(result.total).toBe(1);
    });
  });

  describe("when given a limit and offset", () => {
    it("builds the correct query string", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => response,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await feed(5, 40);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/feed?limit=5&offset=40&ordenacao=mais-votadas",
      );
    });

    it("defaults to limit 20, offset 0, and ordenacao mais-votadas", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => response,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await feed();

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/feed?limit=20&offset=0&ordenacao=mais-votadas",
      );
    });
  });

  describe("when given ordenacao mais-recentes", () => {
    it("includes ordenacao=mais-recentes in the query string", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => response,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await feed(20, 0, "mais-recentes");

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/feed?limit=20&offset=0&ordenacao=mais-recentes",
      );
    });
  });

  describe("when given a tema", () => {
    it("appends tema to the query string", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => response,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await feed(20, 0, "mais-votadas", 37);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/feed?limit=20&offset=0&ordenacao=mais-votadas&tema=37",
      );
    });

    it("omits tema from the query string when undefined", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => response,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await feed(20, 0, "mais-votadas", undefined);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/feed?limit=20&offset=0&ordenacao=mais-votadas",
      );
    });
  });

  describe("when given a q param", () => {
    it("appends q to the query string when provided", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => response,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await feed(20, 0, "mais-votadas", undefined, "saúde pública");

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/feed?limit=20&offset=0&ordenacao=mais-votadas&q=sa%C3%BAde%20p%C3%BAblica",
      );
    });

    it("omits q from the query string when undefined", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => response,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await feed(20, 0, "mais-votadas", undefined, undefined);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/feed?limit=20&offset=0&ordenacao=mais-votadas",
      );
    });

    it("combines tema and q together", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => response,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await feed(20, 0, "mais-votadas", 37, "PEC 3/2021");

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/feed?limit=20&offset=0&ordenacao=mais-votadas&tema=37&q=PEC%203%2F2021",
      );
    });
  });
});

const temasResponse: TemasDisponiveisResponse = {
  items: [
    { externalCodTema: 20, tema: "Administração Pública" },
    { externalCodTema: 37, tema: "Saúde" },
  ],
};

describe("temasDisponiveis", () => {
  describe("when the request succeeds", () => {
    it("returns the typed temas from the response", async () => {
      // Arrange
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => temasResponse,
        }),
      );

      // Act
      const result = await temasDisponiveis();

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.items[0].tema).toBe("Administração Pública");
    });

    it("builds the correct resource path", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => temasResponse,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await temasDisponiveis();

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/feed/temas",
      );
    });
  });
});


const detalheResponse: ProposicaoDetalhe = {
  externalIdProposicao: 42,
  siglaTipo: "PL",
  numero: 1234,
  ano: 2023,
  ementa: "Dispõe sobre alguma coisa.",
  dataApresentacao: "2023-05-10",
  ementaDetalhada: "Texto mais longo explicando a proposição.",
  urlInteiroTeor:
    "https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=42",
  resumoIaDisponivel: false,
  resumoIaCard: null,
  resumoIaDetalhe: null,
  status: {
    siglaOrgao: "PLEN",
    situacao: "Pronta para Pauta",
    regime: "Prioridade",
    dataHora: "2025-03-14T15:00",
  },
  fonteOficial: "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=42",
  temas: [{ externalCodTema: 37, tema: "Saúde" }],
  votacoes: [],
};

describe("detalhe", () => {
  describe("when the request succeeds", () => {
    it("returns the typed proposicao detalhe from the response", async () => {
      // Arrange
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => detalheResponse,
        }),
      );

      // Act
      const result = await detalhe(42);

      // Assert
      expect(result.externalIdProposicao).toBe(42);
      expect(result.ementaDetalhada).toBe(
        "Texto mais longo explicando a proposição.",
      );
      expect(result.urlInteiroTeor).toBe(
        "https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=42",
      );
      expect(result.temas[0].tema).toBe("Saúde");
    });
  });

  describe("when given an external id", () => {
    it("builds the correct resource path", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => detalheResponse,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await detalhe(42);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/42",
      );
    });
  });

  describe("when the proposicao does not exist", () => {
    it("rejects with NotFoundError on a 404 response", async () => {
      // Arrange
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: () => ({}),
        }),
      );

      // Act / Assert
      await expect(detalhe(99)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("when the request fails transiently", () => {
    it("rejects with an ApiError that is not a NotFoundError on a 503 response", async () => {
      // Arrange
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          json: () => ({}),
        }),
      );

      // Act / Assert
      const error = await detalhe(42).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).not.toBeInstanceOf(NotFoundError);
    });
  });
});
