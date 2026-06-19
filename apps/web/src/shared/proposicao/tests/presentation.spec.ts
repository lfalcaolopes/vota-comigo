import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  formatDateWithRelativeTime,
  formatRelativeDate,
  formatShortDate,
  maxIsoDate,
  toAnoApresentacao,
  toIdentificadorLegislativo,
  toTextoResumo,
} from "../presentation";

function makeCard(overrides: Partial<ProposicaoCard> = {}): ProposicaoCard {
  return {
    externalIdProposicao: 1,
    siglaTipo: "PL",
    numero: 1234,
    ano: 2023,
    ementa: "Dispõe sobre alguma coisa.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
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

describe("formatRelativeDate", () => {
  const referenceDate = new Date(2026, 5, 15);

  describe("when the date is less than a month before the reference date", () => {
    it("formats the distance in days", () => {
      // Act / Assert
      expect(formatRelativeDate("2026-06-10", referenceDate)).toBe("há 5 dias");
    });
  });

  describe("when the date is less than a year before the reference date", () => {
    it("formats the distance in months", () => {
      // Act / Assert
      expect(formatRelativeDate("2026-03-15", referenceDate)).toBe("há 3 meses");
    });
  });

  describe("when the date is at least a year before the reference date", () => {
    it("formats the distance in years", () => {
      // Act / Assert
      expect(formatRelativeDate("2025-03-14", referenceDate)).toBe("há 1 ano");
    });
  });

  describe("when there is no date", () => {
    it("returns null", () => {
      // Act / Assert
      expect(formatRelativeDate(null, referenceDate)).toBeNull();
    });
  });
});

describe("formatDateWithRelativeTime", () => {
  describe("when the date is valid", () => {
    it("formats the absolute date with relative context", () => {
      // Arrange
      const referenceDate = new Date(2026, 5, 15);

      // Act / Assert
      expect(formatDateWithRelativeTime("2025-03-14", referenceDate)).toBe(
        "14 mar 2025 (há 1 ano)",
      );
    });
  });

  describe("when the date is missing", () => {
    it("returns null", () => {
      // Act / Assert
      expect(formatDateWithRelativeTime(null)).toBeNull();
    });
  });
});

describe("maxIsoDate", () => {
  describe("when dates and null values are mixed", () => {
    it("returns the latest date string", () => {
      // Act / Assert
      expect(maxIsoDate([null, "2025-03-14", "2024-12-31"])).toBe(
        "2025-03-14",
      );
    });
  });

  describe("when every value is null", () => {
    it("returns null", () => {
      // Act / Assert
      expect(maxIsoDate([null, null])).toBeNull();
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

describe("toTextoResumo", () => {
  describe("when the AI resumo is available", () => {
    it("returns resumoIaCard", () => {
      // Arrange
      const card = makeCard({
        resumoIaDisponivel: true,
        resumoIaCard: "Resumo curto aprovado.",
        ementa: "Ementa oficial.",
      });

      // Act / Assert
      expect(toTextoResumo(card)).toBe("Resumo curto aprovado.");
    });
  });

  describe("when the AI resumo is unavailable", () => {
    it("falls back to ementa", () => {
      // Arrange
      const card = makeCard({
        resumoIaDisponivel: false,
        resumoIaCard: null,
        ementa: "Ementa oficial.",
      });

      // Act / Assert
      expect(toTextoResumo(card)).toBe("Ementa oficial.");
    });
  });

  describe("when there is no resumo and no ementa", () => {
    it("returns null", () => {
      // Arrange
      const card = makeCard({
        resumoIaDisponivel: false,
        resumoIaCard: null,
        ementa: null,
      });

      // Act / Assert
      expect(toTextoResumo(card)).toBeNull();
    });
  });
});
