import { describe, expect, it } from "vitest";

import { buildCampaignDestination, campaignLinks } from "../campaign-links";

describe("campaign short links", () => {
  describe("when resolving a registered homepage link", () => {
    it("builds the tagged destination", () => {
      // Arrange
      const requestUrl = new URL("https://www.quemvotacomigo.com.br/l/fW4ULi");

      // Act
      const destination = buildCampaignDestination(requestUrl, "fW4ULi");

      // Assert
      expect(destination?.toString()).toBe(
        "https://www.quemvotacomigo.com.br/?utm_source=whatsapp&utm_medium=group&utm_campaign=eleicoes2026&utm_content=grupo-familia",
      );
    });
  });

  describe("when resolving a registered deep link", () => {
    it("preserves platform click identifiers and registered UTM values", () => {
      // Arrange
      const requestUrl = new URL(
        "https://www.quemvotacomigo.com.br/l/aAAd3G?fbclid=click-1&utm_source=alterado",
      );

      // Act
      const destination = buildCampaignDestination(requestUrl, "aAAd3G");

      // Assert
      expect(destination?.toString()).toBe(
        "https://www.quemvotacomigo.com.br/achados/01?fbclid=click-1&utm_source=instagram&utm_medium=social&utm_campaign=eleicoes2026&utm_content=achado-01-instagram",
      );
    });
  });

  describe("when the code is unknown", () => {
    it("does not create a destination", () => {
      // Arrange
      const requestUrl = new URL("https://www.quemvotacomigo.com.br/l/unknown");

      // Act
      const destination = buildCampaignDestination(requestUrl, "unknown");

      // Assert
      expect(destination).toBeNull();
    });
  });

  describe("when validating the registry", () => {
    it("contains unique Base58 codes and UTM content values", () => {
      // Arrange
      const codes = campaignLinks.map(({ code }) => code);
      const utmContents = campaignLinks.map(({ utmContent }) => utmContent);

      // Act
      const uniqueCodes = new Set(codes);
      const uniqueUtmContents = new Set(utmContents);

      // Assert
      expect(campaignLinks).toHaveLength(48);
      expect(uniqueCodes.size).toBe(codes.length);
      expect(uniqueUtmContents.size).toBe(utmContents.length);
      expect(
        codes.every((code) => /^[1-9A-HJ-NP-Za-km-z]{6}$/.test(code)),
      ).toBe(true);
    });
  });
});
