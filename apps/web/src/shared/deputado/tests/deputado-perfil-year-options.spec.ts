import { describe, expect, it } from "vitest";

import { listDeputadoPerfilYears } from "../deputado-perfil-year-options";

describe("listDeputadoPerfilYears", () => {
  describe("when the profile has a valid year range", () => {
    it("lists only that range from most recent to oldest", () => {
      // Arrange / Act
      const years = listDeputadoPerfilYears({
        startYear: 2022,
        endYear: 2026,
      });

      // Assert
      expect(years).toEqual([2026, 2025, 2024, 2023, 2022]);
    });
  });
});
