import type { DeputadoPerfil } from "@vota-comigo/shared-types";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { perfil } = vi.hoisted(() => ({ perfil: vi.fn() }));

vi.mock("@/shared/deputado", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/deputado")>();
  return { ...original, perfil };
});

import { proxy } from "@/proxy";

function deputado(): DeputadoPerfil {
  return {
    externalIdDeputado: 204379,
    nomePublico: "ACÁCIO FAVACHO",
  } as DeputadoPerfil;
}

beforeEach(() => {
  perfil.mockReset();
  perfil.mockResolvedValue(deputado());
});

describe("deputy profile proxy", () => {
  describe("when the URL contains only the source ID", () => {
    it("permanently redirects to the canonical slug and preserves the query", async () => {
      // Arrange
      const request = new NextRequest(
        "https://quemvotacomigo.com.br/deputados/204379?year=2024",
      );

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "https://quemvotacomigo.com.br/deputados/204379-acacio-favacho?year=2024",
      );
    });
  });

  describe("when the URL contains an outdated slug", () => {
    it("permanently redirects to the current canonical slug", async () => {
      // Arrange
      const request = new NextRequest(
        "https://quemvotacomigo.com.br/deputados/204379-slug-antigo",
      );

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "https://quemvotacomigo.com.br/deputados/204379-acacio-favacho",
      );
    });
  });

  describe("when the URL is already canonical", () => {
    it("continues to the profile route", async () => {
      // Arrange
      const request = new NextRequest(
        "https://quemvotacomigo.com.br/deputados/204379-acacio-favacho",
      );

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("when the segment is not a deputy ID", () => {
    it("continues without calling the profile API", async () => {
      // Arrange
      const request = new NextRequest(
        "https://quemvotacomigo.com.br/deputados/comparativo",
      );

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(200);
      expect(perfil).not.toHaveBeenCalled();
    });
  });
});
