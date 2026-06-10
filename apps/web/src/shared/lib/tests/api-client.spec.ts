import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, NotFoundError, apiGet, apiPost } from "../api-client";

function mockFetch(response: {
  ok?: boolean;
  status?: number;
  json?: () => unknown;
}) {
  return vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => (response.json ?? (() => ({})))(),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiGet", () => {
  describe("when the response is ok", () => {
    it("returns the parsed body", async () => {
      // Arrange
      const body = { hello: "world" };
      vi.stubGlobal("fetch", mockFetch({ ok: true, json: () => body }));

      // Act
      const result = await apiGet<typeof body>("/whatever");

      // Assert
      expect(result).toEqual(body);
    });

    it("prepends the base URL to the path", async () => {
      // Arrange
      const fetchSpy = mockFetch({ ok: true, json: () => ({}) });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await apiGet("/proposicoes/mais-votadas");

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/proposicoes/mais-votadas",
      );
    });
  });

  describe("when the response is a 404", () => {
    it("throws a NotFoundError", async () => {
      // Arrange
      vi.stubGlobal("fetch", mockFetch({ ok: false, status: 404 }));

      // Act / Assert
      await expect(apiGet("/missing")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("when the response is another non-ok status", () => {
    it("throws a transient ApiError", async () => {
      // Arrange
      vi.stubGlobal("fetch", mockFetch({ ok: false, status: 503 }));

      // Act / Assert
      const error = await apiGet("/down").catch((err: unknown) => err);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).not.toBeInstanceOf(NotFoundError);
      expect((error as ApiError).status).toBe(503);
    });
  });
});

describe("apiPost", () => {
  describe("when the response is ok", () => {
    it("returns the parsed body", async () => {
      // Arrange
      const body = { deputados: [] };
      vi.stubGlobal("fetch", mockFetch({ ok: true, json: () => body }));

      // Act
      const result = await apiPost<typeof body>("/matcher", { siglaUf: "SP" });

      // Assert
      expect(result).toEqual(body);
    });

    it("posts the body as JSON to the prefixed URL", async () => {
      // Arrange
      const fetchSpy = mockFetch({ ok: true, json: () => ({}) });
      vi.stubGlobal("fetch", fetchSpy);

      // Act
      await apiPost("/matcher?limit=20&offset=0", { siglaUf: "SP" });

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3001/matcher?limit=20&offset=0",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siglaUf: "SP" }),
        },
      );
    });
  });

  describe("when the response is a 404", () => {
    it("throws a NotFoundError", async () => {
      // Arrange
      vi.stubGlobal("fetch", mockFetch({ ok: false, status: 404 }));

      // Act / Assert
      await expect(apiPost("/matcher", {})).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("when the response is another non-ok status", () => {
    it("throws a transient ApiError", async () => {
      // Arrange
      vi.stubGlobal("fetch", mockFetch({ ok: false, status: 503 }));

      // Act / Assert
      const error = await apiPost("/matcher", {}).catch((err: unknown) => err);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).not.toBeInstanceOf(NotFoundError);
      expect((error as ApiError).status).toBe(503);
    });
  });
});
