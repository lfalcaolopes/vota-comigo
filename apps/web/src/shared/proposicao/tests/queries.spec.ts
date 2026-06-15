import type {
  ProposicoesFeedResponse,
  ProposicaoDetalhe,
  ProposicoesSearchResponse,
} from "@vota-comigo/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, EmptyQueryError, NotFoundError } from "../../lib/api-client";
import { detalhe, feed, search } from "../queries";

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
        "http://localhost:3001/proposicoes/feed?limit=5&offset=40",
      );
    });

    it("defaults to limit 20 and offset 0", async () => {
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
        "http://localhost:3001/proposicoes/feed?limit=20&offset=0",
      );
    });
  });
});

const searchResponse: ProposicoesSearchResponse = {
  ...response,
  query: "saúde",
};

describe("search", () => {
  describe("when the query is a useful term", () => {
    it("returns the typed items from the response wrapper", async () => {
      // Arrange
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => searchResponse,
        }),
      );

      // Act
      const result = await search("saúde");

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.query).toBe("saúde");
    });

    it("encodes the term and builds the correct query string", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => searchResponse,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await search("saúde pública", 5, 40);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/search?q=sa%C3%BAde%20p%C3%BAblica&limit=5&offset=40",
      );
    });

    it("defaults to limit 20 and offset 0", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => searchResponse,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await search("PL 1234");

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/search?q=PL%201234&limit=20&offset=0",
      );
    });
  });

  describe("when the query is empty or whitespace", () => {
    it("rejects with EmptyQueryError without calling fetch", async () => {
      // Arrange
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      // Act / Assert
      await expect(search("   ")).rejects.toBeInstanceOf(EmptyQueryError);
      expect(fetchSpy).not.toHaveBeenCalled();
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
