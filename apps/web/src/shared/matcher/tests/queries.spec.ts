import type {
  MatcherExecucaoRequest,
  MatcherResultado,
} from "@vota-comigo/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, NotFoundError } from "../../lib/api-client";
import { runMatcher } from "../queries";

const request: MatcherExecucaoRequest = {
  siglaUf: "SP",
  escopo: "estadual",
  posicoes: [
    { externalIdProposicao: 1, posicao: "aprovar" },
    { externalIdProposicao: 2, posicao: "rejeitar" },
    { externalIdProposicao: 3, posicao: "aprovar" },
  ],
};

const resultado: MatcherResultado = {
  siglaUf: "SP",
  cidade: null,
  totalProposicoesSelecionadas: 3,
  totalPosicoesComputaveis: 3,
  escopo: "estadual",
  deputados: [],
  totalDeputadosAvaliados: 0,
  deputadosHistoricoIncompleto: 0,
  total: 0,
  limit: 20,
  offset: 0,
  semBomMatch: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runMatcher", () => {
  describe("when the execution succeeds", () => {
    it("returns the typed matcher result", async () => {
      // Arrange
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => resultado,
        }),
      );

      // Act
      const result = await runMatcher(request, { limit: 20, offset: 0 });

      // Assert
      expect(result.escopo).toBe("estadual");
      expect(result.totalPosicoesComputaveis).toBe(3);
    });
  });

  describe("when given pagination", () => {
    it("posts the request body to /matcher with the limit and offset query", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => resultado,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await runMatcher(request, { limit: 5, offset: 40 });

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/matcher?limit=5&offset=40",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        },
      );
    });

    it("defaults to limit 20 and offset 0", async () => {
      // Arrange
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => resultado,
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await runMatcher(request);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/matcher?limit=20&offset=0",
        expect.objectContaining({ method: "POST" }),
      );
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
      const error = await runMatcher(request).catch(
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(ApiError);
      expect(error).not.toBeInstanceOf(NotFoundError);
    });
  });
});
