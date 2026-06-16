import type { DeputadoPerfil } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  formatPercentual,
  getInitials,
  nomePublicoLabel,
  toAtividadeLabel,
  toAtividadeTone,
  toPresencaAmostrasLabel,
} from "../presentation";

function makePerfil(overrides: Partial<DeputadoPerfil> = {}): DeputadoPerfil {
  return {
    externalIdDeputado: 220593,
    nomePublico: "Maria da Silva",
    nomeCivil: "Maria Aparecida da Silva",
    fonteOficial: "https://www.camara.leg.br/deputados/220593",
    historicoParlamentarDisponivel: true,
    snapshotPublicoDisponivel: true,
    snapshotPublico: {
      nomeEleitoral: "Maria da Silva",
      siglaPartido: "PT",
      siglaUf: "SP",
      urlFoto: "https://example.com/foto.jpg",
    },
    emAtividade: true,
    redesSociais: [],
    dataNascimento: null,
    municipioNascimento: null,
    ufNascimento: null,
    externalIdLegislaturaInicial: null,
    externalIdLegislaturaFinal: null,
    resumoPresencaDisponivel: false,
    resumoPresenca: null,
    ...overrides,
  };
}

describe("nomePublicoLabel", () => {
  describe("when the perfil has a public name", () => {
    it("returns the public name", () => {
      // Act / Assert
      expect(nomePublicoLabel(makePerfil())).toBe("Maria da Silva");
    });
  });

  describe("when the perfil has no public name", () => {
    it("falls back to a generic deputado label", () => {
      // Act / Assert
      expect(nomePublicoLabel(makePerfil({ nomePublico: null }))).toBe(
        "Deputado federal",
      );
    });
  });
});

describe("toAtividadeLabel", () => {
  describe("when emAtividade is true", () => {
    it("returns the active label", () => {
      // Act / Assert
      expect(toAtividadeLabel(true)).toBe("Em atividade");
    });
  });

  describe("when emAtividade is false", () => {
    it("returns the inactive label", () => {
      // Act / Assert
      expect(toAtividadeLabel(false)).toBe("Mandato encerrado");
    });
  });
});

describe("toAtividadeTone", () => {
  describe("when emAtividade is true", () => {
    it("returns success tone", () => {
      // Act / Assert
      expect(toAtividadeTone(true)).toBe("success");
    });
  });

  describe("when emAtividade is false", () => {
    it("returns neutral tone", () => {
      // Act / Assert
      expect(toAtividadeTone(false)).toBe("neutral");
    });
  });
});

describe("getInitials", () => {
  describe("when the name has two or more meaningful words", () => {
    it("returns the first and last initials", () => {
      // Act / Assert
      expect(getInitials("João Silva")).toBe("JS");
    });
  });

  describe("when the name has only one word", () => {
    it("returns the first initial", () => {
      // Act / Assert
      expect(getInitials("João")).toBe("J");
    });
  });

  describe("when the name has particle words like 'de'", () => {
    it("skips particles and uses meaningful initials", () => {
      // Act / Assert
      expect(getInitials("João de Oliveira")).toBe("JO");
    });
  });

  describe("when the name has extra whitespace", () => {
    it("trims and normalizes whitespace", () => {
      // Act / Assert
      expect(getInitials("  Ana   Lima  ")).toBe("AL");
    });
  });

  describe("when the name is null", () => {
    it("returns the fallback ?", () => {
      // Act / Assert
      expect(getInitials(null)).toBe("?");
    });
  });

  describe("when the name is empty", () => {
    it("returns the fallback ?", () => {
      // Act / Assert
      expect(getInitials("")).toBe("?");
    });
  });

  describe("when the name is only whitespace", () => {
    it("returns the fallback ?", () => {
      // Act / Assert
      expect(getInitials("   ")).toBe("?");
    });
  });
});

describe("formatPercentual", () => {
  describe("when the value is an integer", () => {
    it("returns the value formatted as integer percentage", () => {
      // Act / Assert
      expect(formatPercentual(72)).toBe("72%");
    });
  });

  describe("when the value is 0", () => {
    it("returns 0%", () => {
      // Act / Assert
      expect(formatPercentual(0)).toBe("0%");
    });
  });

  describe("when the value is 100", () => {
    it("returns 100%", () => {
      // Act / Assert
      expect(formatPercentual(100)).toBe("100%");
    });
  });

  describe("when the value has a decimal below 0.5", () => {
    it("rounds down", () => {
      // Act / Assert
      expect(formatPercentual(49.4)).toBe("49%");
    });
  });

  describe("when the value has a decimal at or above 0.5", () => {
    it("rounds up", () => {
      // Act / Assert
      expect(formatPercentual(49.6)).toBe("50%");
    });
  });
});

describe("toPresencaAmostrasLabel", () => {
  describe("when given presencas and total", () => {
    it("returns the formatted sample label", () => {
      // Act / Assert
      expect(toPresencaAmostrasLabel(80, 100)).toBe(
        "80 de 100 votações em exercício",
      );
    });
  });

  describe("when presencas is 0", () => {
    it("shows zero presencas", () => {
      // Act / Assert
      expect(toPresencaAmostrasLabel(0, 10)).toBe(
        "0 de 10 votações em exercício",
      );
    });
  });
});
