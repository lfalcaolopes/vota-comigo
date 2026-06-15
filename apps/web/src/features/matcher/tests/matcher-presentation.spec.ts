import type { AlertaMatcher, MatcherDeputadoResumo } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  SEM_BOM_MATCH_BANNER_BODY,
  SEM_BOM_MATCH_BANNER_TITLE,
  formatPercentual,
  getInitials,
  toAlertaLabel,
  toAmostraComparavelLabel,
  toAtividadeLabel,
  toAtividadeTone,
} from "../lib/matcher-presentation";

function makeDeputado(
  overrides: Partial<MatcherDeputadoResumo> = {},
): MatcherDeputadoResumo {
  return {
    externalIdDeputado: 1,
    nome: "João Silva",
    partido: "PT",
    siglaUf: "SP",
    urlFoto: null,
    compatibilidadeBruta: 72,
    amostraComparavel: 8,
    scoreOrdenacaoPercentual: 68,
    alertas: [],
    emAtividade: true,
    ...overrides,
  };
}

describe("formatPercentual", () => {
  describe("when value is an integer", () => {
    it("returns the value followed by %", () => {
      // Act / Assert
      expect(formatPercentual(72)).toBe("72%");
    });

    it("returns '0%' for zero", () => {
      // Act / Assert
      expect(formatPercentual(0)).toBe("0%");
    });

    it("returns '100%' for 100", () => {
      // Act / Assert
      expect(formatPercentual(100)).toBe("100%");
    });
  });

  describe("when value has a decimal part", () => {
    it("rounds down when fractional part is below .5", () => {
      // Act / Assert
      expect(formatPercentual(49.4)).toBe("49%");
    });

    it("rounds up when fractional part is .5 or above", () => {
      // Act / Assert
      expect(formatPercentual(49.6)).toBe("50%");
    });
  });
});

describe("toAmostraComparavelLabel", () => {
  describe("when deputado has a valid sample and totalPosicoesComputaveis", () => {
    it("returns the sample fraction against the total computable positions", () => {
      // Arrange
      const deputado = makeDeputado({ amostraComparavel: 8 });

      // Act
      const label = toAmostraComparavelLabel(deputado, 10);

      // Assert
      expect(label).toBe("8 de 10 votações comparáveis");
    });
  });

  describe("when deputado has alertas", () => {
    it("returns the same label regardless of alertas content", () => {
      // Arrange
      const withAlerta = makeDeputado({
        amostraComparavel: 3,
        alertas: ["amostra_pequena"],
      });
      const withoutAlerta = makeDeputado({
        amostraComparavel: 3,
        alertas: [],
      });

      // Act
      const labelWith = toAmostraComparavelLabel(withAlerta, 10);
      const labelWithout = toAmostraComparavelLabel(withoutAlerta, 10);

      // Assert
      expect(labelWith).toBe(labelWithout);
    });
  });
});

describe("toAlertaLabel", () => {
  describe("when alerta is amostra_pequena", () => {
    it("returns 'Amostra pequena'", () => {
      // Arrange
      const alerta: AlertaMatcher = "amostra_pequena";

      // Act / Assert
      expect(toAlertaLabel(alerta)).toBe("Amostra pequena");
    });
  });
});

describe("toAtividadeLabel", () => {
  describe("when emAtividade is true", () => {
    it("returns 'Em atividade'", () => {
      // Act / Assert
      expect(toAtividadeLabel(true)).toBe("Em atividade");
    });
  });

  describe("when emAtividade is false", () => {
    it("returns 'Mandato encerrado'", () => {
      // Act / Assert
      expect(toAtividadeLabel(false)).toBe("Mandato encerrado");
    });
  });
});

describe("toAtividadeTone", () => {
  describe("when emAtividade is true", () => {
    it("returns 'success'", () => {
      // Act / Assert
      expect(toAtividadeTone(true)).toBe("success");
    });
  });

  describe("when emAtividade is false", () => {
    it("returns 'neutral'", () => {
      // Act / Assert
      expect(toAtividadeTone(false)).toBe("neutral");
    });
  });
});

describe("getInitials", () => {
  describe("when nome has two words", () => {
    it("returns first letter of each word, uppercased", () => {
      // Act / Assert
      expect(getInitials("João Silva")).toBe("JS");
    });
  });

  describe("when nome is a single word", () => {
    it("returns only the first letter", () => {
      // Act / Assert
      expect(getInitials("João")).toBe("J");
    });
  });

  describe("when nome contains lowercase particles", () => {
    it("skips particles and takes first and last meaningful initials", () => {
      // Act / Assert
      expect(getInitials("João de Oliveira")).toBe("JO");
    });
  });

  describe("when nome has extra whitespace", () => {
    it("treats multiple spaces as one separator", () => {
      // Act / Assert
      expect(getInitials("  Ana   Lima  ")).toBe("AL");
    });
  });

  describe("when nome is null", () => {
    it("returns '?'", () => {
      // Act / Assert
      expect(getInitials(null)).toBe("?");
    });
  });

  describe("when nome is an empty string", () => {
    it("returns '?'", () => {
      // Act / Assert
      expect(getInitials("")).toBe("?");
    });
  });

  describe("when nome is all whitespace", () => {
    it("returns '?'", () => {
      // Act / Assert
      expect(getInitials("   ")).toBe("?");
    });
  });
});

describe("SEM_BOM_MATCH_BANNER_TITLE", () => {
  it("is a non-empty string", () => {
    // Act / Assert
    expect(typeof SEM_BOM_MATCH_BANNER_TITLE).toBe("string");
    expect(SEM_BOM_MATCH_BANNER_TITLE.length).toBeGreaterThan(0);
  });
});

describe("SEM_BOM_MATCH_BANNER_BODY", () => {
  it("is a non-empty string", () => {
    // Act / Assert
    expect(typeof SEM_BOM_MATCH_BANNER_BODY).toBe("string");
    expect(SEM_BOM_MATCH_BANNER_BODY.length).toBeGreaterThan(0);
  });
});
