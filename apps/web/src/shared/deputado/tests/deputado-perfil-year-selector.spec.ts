import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoPerfilYearSelector } from "../deputado-perfil-year-selector";

describe("DeputadoPerfilYearSelector", () => {
  describe("when the profile has available years", () => {
    it("renders the selected year and only the valid options", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(DeputadoPerfilYearSelector, {
          initialYear: 2025,
          validYearRange: { startYear: 2023, endYear: 2026 },
        }),
      );

      // Assert
      expect(html).toContain(">Ano<");
      expect(html).toContain('<option value="2026">2026</option>');
      expect(html).toContain('<option value="2025" selected="">2025</option>');
      expect(html).toContain('<option value="2023">2023</option>');
      expect(html).not.toContain('value="2022"');
    });
  });

  describe("when only some profile years have CEAP data", () => {
    it("offers only loaded years and keeps a direct unloaded year out of the options", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(DeputadoPerfilYearSelector, {
          availableYears: [2025, 2023],
          initialYear: 2022,
          validYearRange: { startYear: 2022, endYear: 2026 },
        }),
      );

      // Assert
      expect(html).toContain('<option value="2025">2025</option>');
      expect(html).toContain('<option value="2023">2023</option>');
      expect(html).not.toContain('<option value="2026">');
      expect(html).not.toContain('<option value="2024">');
      expect(html).not.toContain('<option value="2022">');
      expect(html).toContain("Selecione um ano carregado");
    });
  });
});
