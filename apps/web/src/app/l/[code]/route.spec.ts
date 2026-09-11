import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /l/:code", () => {
  describe("when the code exists", () => {
    it("temporarily redirects to the tagged destination without caching", async () => {
      // Arrange
      const request = new NextRequest(
        "https://www.quemvotacomigo.com.br/l/fW4ULi",
      );

      // Act
      const response = await GET(request, {
        params: Promise.resolve({ code: "fW4ULi" }),
      });

      // Assert
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "https://www.quemvotacomigo.com.br/?utm_source=whatsapp&utm_medium=group&utm_campaign=eleicoes2026&utm_content=grupo-familia",
      );
      expect(response.headers.get("cache-control")).toBe("no-store");
    });
  });

  describe("when the code does not exist", () => {
    it("returns a not found response", async () => {
      // Arrange
      const request = new NextRequest(
        "https://www.quemvotacomigo.com.br/l/abcdef",
      );

      // Act
      const response = await GET(request, {
        params: Promise.resolve({ code: "abcdef" }),
      });

      // Assert
      expect(response.status).toBe(404);
      await expect(response.text()).resolves.toBe("Link curto não encontrado.");
    });
  });
});
