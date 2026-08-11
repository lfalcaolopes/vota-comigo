import { describe, expect, it } from "vitest";

import {
  buildDeputadoPerfilYearHref,
  parseDeputadoPerfilYear,
} from "../deputado-perfil-year-url";

describe("parseDeputadoPerfilYear", () => {
  describe("when the address contains a valid year", () => {
    it("restores the selected year", () => {
      // Arrange / Act
      const year = parseDeputadoPerfilYear("2022", 2026, {
        startYear: 2019,
        endYear: 2026,
      });

      // Assert
      expect(year).toBe(2022);
    });
  });

  describe("when the address contains an invalid year", () => {
    it("falls back to the profile default", () => {
      // Arrange / Act
      const year = parseDeputadoPerfilYear("2018", 2026, {
        startYear: 2019,
        endYear: 2026,
      });

      // Assert
      expect(year).toBe(2026);
    });
  });
});

describe("buildDeputadoPerfilYearHref", () => {
  it("writes the selected year as a shareable query parameter", () => {
    // Arrange / Act
    const href = buildDeputadoPerfilYearHref("/deputados/220593", "", 2022);

    // Assert
    expect(href).toBe("/deputados/220593?year=2022");
  });
});
