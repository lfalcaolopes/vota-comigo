import { describe, expect, it } from "vitest";

import {
  buildDeputadoHref,
  parseExternalIdDeputado,
  toDeputadoSlug,
} from "../deputado-url";

describe("deputy profile URLs", () => {
  describe("when building a canonical URL", () => {
    it("keeps the source ID and normalizes the public name", () => {
      // Act
      const href = buildDeputadoHref(204379, "Arthur César Pereira de Lira");

      // Assert
      expect(href).toBe("/deputados/204379-arthur-cesar-pereira-de-lira");
    });
  });

  describe("when normalizing punctuation and whitespace", () => {
    it("collapses them into single hyphens", () => {
      // Act
      const slug = toDeputadoSlug("  João d'Ávila -- Neto  ");

      // Assert
      expect(slug).toBe("joao-d-avila-neto");
    });
  });

  describe("when reading a route segment", () => {
    it.each([
      ["204379", 204379],
      ["204379-arthur-lira", 204379],
      ["arthur-lira", null],
      ["204379arthur", null],
      ["0-arthur", null],
    ])("reads %s as %s", (segment, expected) => {
      // Act
      const result = parseExternalIdDeputado(segment);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
