import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  formatShortDate,
  toAnoApresentacao,
  toIdentificadorLegislativo,
} from "../presentation";

function makeCard(overrides: Partial<ProposicaoCard> = {}): ProposicaoCard {
  return {
    externalIdProposicao: 1,
    siglaTipo: "PL",
    numero: 1234,
    ano: 2023,
    ementa: "Dispõe sobre alguma coisa.",
    dataApresentacao: "2023-05-10",
    volumeVotacoesPlenario: 7,
    dataUltimaVotacao: "2025-03-14",
    ...overrides,
  };
}

describe("toIdentificadorLegislativo", () => {
  describe("when all fields are present", () => {
    it("builds the full sigla numero/ano form", () => {
      // Arrange
      const card = makeCard();

      // Act
      const id = toIdentificadorLegislativo(card);

      // Assert
      expect(id).toBe("PL 1234/2023");
    });
  });

  describe("when fields are missing", () => {
    it("drops the ano but keeps sigla and numero", () => {
      // Act / Assert
      expect(
        toIdentificadorLegislativo(makeCard({ ano: null })),
      ).toBe("PL 1234");
    });

    it("drops the numero but keeps sigla and ano", () => {
      // Act / Assert
      expect(
        toIdentificadorLegislativo(makeCard({ numero: null })),
      ).toBe("PL 2023");
    });

    it("keeps only the sigla when numero and ano are missing", () => {
      // Act / Assert
      expect(
        toIdentificadorLegislativo(
          makeCard({ numero: null, ano: null }),
        ),
      ).toBe("PL");
    });

    it("keeps only the numero/ano when sigla is missing", () => {
      // Act / Assert
      expect(
        toIdentificadorLegislativo(makeCard({ siglaTipo: null })),
      ).toBe("1234/2023");
    });

    it("returns null when every field is missing", () => {
      // Act / Assert
      expect(
        toIdentificadorLegislativo(
          makeCard({ siglaTipo: null, numero: null, ano: null }),
        ),
      ).toBeNull();
    });
  });
});

describe("formatShortDate", () => {
  describe("when given a date-only ISO string", () => {
    it("formats it as a pt-BR short date", () => {
      // Act / Assert
      expect(formatShortDate("2025-03-14")).toBe("14 mar 2025");
    });

    it("does not drift to the previous day regardless of timezone", () => {
      // Act
      const formatted = formatShortDate("2025-01-01");

      // Assert
      expect(formatted).toBe("1 jan 2025");
    });
  });

  describe("when there is no date", () => {
    it("returns null", () => {
      // Act / Assert
      expect(formatShortDate(null)).toBeNull();
    });
  });
});

describe("toAnoApresentacao", () => {
  describe("when dataApresentacao is present", () => {
    it("derives the year from it", () => {
      // Act / Assert
      expect(
        toAnoApresentacao(makeCard({ dataApresentacao: "2019-11-02", ano: 2023 })),
      ).toBe(2019);
    });
  });

  describe("when dataApresentacao is missing", () => {
    it("falls back to ano", () => {
      // Act / Assert
      expect(
        toAnoApresentacao(makeCard({ dataApresentacao: null, ano: 2021 })),
      ).toBe(2021);
    });

    it("returns null when ano is also missing", () => {
      // Act / Assert
      expect(
        toAnoApresentacao(makeCard({ dataApresentacao: null, ano: null })),
      ).toBeNull();
    });
  });

  describe("when dataApresentacao is present but not a valid date", () => {
    it("falls back to ano instead of deriving a bogus year", () => {
      // Act / Assert
      expect(
        toAnoApresentacao(makeCard({ dataApresentacao: "", ano: 2020 })),
      ).toBe(2020);
    });
  });
});
