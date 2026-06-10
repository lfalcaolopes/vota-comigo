import type { MaisVotadasResponse } from "@vota-comigo/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { maisVotadas } from "../queries";

const response: MaisVotadasResponse = {
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

describe("maisVotadas", () => {
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
      const result = await maisVotadas(20, 0);

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
      await maisVotadas(5, 40);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/mais-votadas?limit=5&offset=40",
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
      await maisVotadas();

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/mais-votadas?limit=20&offset=0",
      );
    });
  });
});
