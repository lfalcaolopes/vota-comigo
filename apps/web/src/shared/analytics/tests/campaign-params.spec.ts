import { describe, expect, it } from "vitest";

import { keepCampaignParams } from "../campaign-params";

describe("keepCampaignParams", () => {
  describe("when the url carries campaign and other params", () => {
    it("keeps only the utm params", () => {
      // Arrange
      const url =
        "https://www.quemvotacomigo.com.br/deputados?q=joao&utm_source=whatsapp&partido=PT&utm_content=grupo-a";

      // Act
      const result = keepCampaignParams(url);

      // Assert
      expect(result).toBe(
        "https://www.quemvotacomigo.com.br/deputados?utm_source=whatsapp&utm_content=grupo-a",
      );
    });
  });

  describe("when the url has no campaign params", () => {
    it("drops the whole query string", () => {
      // Arrange
      const url =
        "https://www.quemvotacomigo.com.br/matcher/resultado?partido=PT&sexo=F";

      // Act
      const result = keepCampaignParams(url);

      // Assert
      expect(result).toBe(
        "https://www.quemvotacomigo.com.br/matcher/resultado",
      );
    });
  });

  describe("when the url is relative", () => {
    it("returns a relative url with only the utm params", () => {
      // Arrange
      const url = "/proposicoes?q=reforma&utm_campaign=eleicoes2026";

      // Act
      const result = keepCampaignParams(url);

      // Assert
      expect(result).toBe("/proposicoes?utm_campaign=eleicoes2026");
    });
  });

  describe("when the url has a hash", () => {
    it("drops the hash", () => {
      // Arrange
      const url = "https://www.quemvotacomigo.com.br/?utm_source=linkedin#topo";

      // Act
      const result = keepCampaignParams(url);

      // Assert
      expect(result).toBe(
        "https://www.quemvotacomigo.com.br/?utm_source=linkedin",
      );
    });
  });
});
