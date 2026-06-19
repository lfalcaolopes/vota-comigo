import type {
  DeputadoVotacaoClassification,
  MatcherEffect,
  MatcherVotoDetalhe,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  AMOSTRA_PEQUENA_CAVEAT,
  FORA_DO_DENOMINADOR_EXPLICACAO,
  countVotosByFiltro,
  filterVotos,
  formatAmostraComparavel,
  groupVotosByMatcherEffect,
  sortVotosByVotacaoDataDesc,
  toFiltroLabel,
  toMatcherEffectLabel,
  toMatcherEffectVerdict,
  toPosicaoLabel,
  toSituacaoLabel,
} from "../lib/matcher-detalhe-presentation";

function voto(
  matcherEffect: MatcherEffect,
  situacao: DeputadoVotacaoClassification = "sim",
  posicaoUsuario: "aprovar" | "rejeitar" = "aprovar",
  data: string | null = "2024-06-01",
): MatcherVotoDetalhe {
  return {
    proposicao: {
      externalIdProposicao: Math.floor(Math.random() * 10000),
      siglaTipo: "PL",
      numero: 1,
      ano: 2024,
      ementa: "Ementa teste",
      resumoIaDisponivel: false,
      resumoIaCard: null,
      dataApresentacao: "2024-01-01",
      volumeVotacoesPlenario: 1,
      dataUltimaVotacao: "2024-06-01",
    },
    posicaoUsuario,
    votacaoReferencia: {
      externalIdVotacao: `voto-${data ?? "null"}-${Math.random()}`,
      data,
      descricao: null,
      pattern: "projeto_de_lei",
      votosSim: 300,
      votosNao: 100,
      votosOutros: 10,
      resultado: "aprovada",
    },
    situacaoDeputadoVotacao: situacao,
    matcherEffect,
  };
}

describe("groupVotosByMatcherEffect", () => {
  describe("when votos span all three effects", () => {
    it("places each voto under its effect key", () => {
      // Arrange
      const v1 = voto("concordancia");
      const v2 = voto("discordancia");
      const v3 = voto("fora_do_denominador");

      // Act
      const groups = groupVotosByMatcherEffect([v1, v2, v3]);

      // Assert
      expect(groups.concordancia).toEqual([v1]);
      expect(groups.discordancia).toEqual([v2]);
      expect(groups.fora_do_denominador).toEqual([v3]);
    });
  });

  describe("when votos have multiple entries for the same effect", () => {
    it("preserves insertion order within the group", () => {
      // Arrange
      const v1 = voto("concordancia");
      const v2 = voto("concordancia");
      const v3 = voto("concordancia");

      // Act
      const groups = groupVotosByMatcherEffect([v1, v2, v3]);

      // Assert
      expect(groups.concordancia).toEqual([v1, v2, v3]);
    });
  });

  describe("when some effects have no votos", () => {
    it("returns an empty array for the missing effects", () => {
      // Arrange
      const v1 = voto("concordancia");

      // Act
      const groups = groupVotosByMatcherEffect([v1]);

      // Assert
      expect(groups.discordancia).toEqual([]);
      expect(groups.fora_do_denominador).toEqual([]);
    });
  });

  describe("when votos is empty", () => {
    it("returns empty arrays for all effects", () => {
      // Act
      const groups = groupVotosByMatcherEffect([]);

      // Assert
      expect(groups.concordancia).toEqual([]);
      expect(groups.discordancia).toEqual([]);
      expect(groups.fora_do_denominador).toEqual([]);
    });
  });

  describe("immutability", () => {
    it("does not mutate the input array", () => {
      // Arrange
      const v1 = voto("concordancia");
      const input = [v1];
      const snapshot = [...input];

      // Act
      groupVotosByMatcherEffect(input);

      // Assert
      expect(input).toEqual(snapshot);
    });
  });
});

describe("toSituacaoLabel", () => {
  const cases: [DeputadoVotacaoClassification, string][] = [
    ["sim", "Sim"],
    ["nao", "Não"],
    ["abstencao", "Abstenção"],
    ["obstrucao", "Obstrução"],
    ["ausencia_sem_motivo_conhecido", "Ausência sem motivo conhecido"],
    ["fora_de_exercicio", "Fora de exercício"],
    ["artigo_17", "Artigo 17"],
    ["voto_nao_informado", "Voto não informado"],
    ["lacuna_de_dados", "Sem dados"],
  ];

  for (const [situacao, expected] of cases) {
    it(`maps '${situacao}' to '${expected}'`, () => {
      // Act / Assert
      expect(toSituacaoLabel(situacao)).toBe(expected);
    });
  }
});

describe("toPosicaoLabel", () => {
  describe("when posicao is aprovar", () => {
    it("returns 'A favor da aprovação'", () => {
      // Act / Assert
      expect(toPosicaoLabel("aprovar")).toBe("A favor da aprovação");
    });
  });

  describe("when posicao is rejeitar", () => {
    it("returns 'Contra a aprovação'", () => {
      // Act / Assert
      expect(toPosicaoLabel("rejeitar")).toBe("Contra a aprovação");
    });
  });
});

describe("toMatcherEffectLabel", () => {
  describe("when effect is concordancia", () => {
    it("returns 'Concordou'", () => {
      // Act / Assert
      expect(toMatcherEffectLabel("concordancia")).toBe("Concordou");
    });
  });

  describe("when effect is discordancia", () => {
    it("returns 'Discordou'", () => {
      // Act / Assert
      expect(toMatcherEffectLabel("discordancia")).toBe("Discordou");
    });
  });

  describe("when effect is fora_do_denominador", () => {
    it("returns 'Fora do denominador'", () => {
      // Act / Assert
      expect(toMatcherEffectLabel("fora_do_denominador")).toBe(
        "Fora do denominador",
      );
    });
  });
});

describe("toMatcherEffectVerdict", () => {
  describe("when effect is concordancia", () => {
    it("reads as aligned with a success tone", () => {
      // Act
      const verdict = toMatcherEffectVerdict("concordancia");

      // Assert
      expect(verdict).toEqual({ label: "Alinhado", tone: "success" });
    });
  });

  describe("when effect is discordancia", () => {
    it("reads as divergent with a danger tone", () => {
      // Act
      const verdict = toMatcherEffectVerdict("discordancia");

      // Assert
      expect(verdict).toEqual({ label: "Divergente", tone: "danger" });
    });
  });

  describe("when effect is fora_do_denominador", () => {
    it("reads as outside the calculation with a neutral tone", () => {
      // Act
      const verdict = toMatcherEffectVerdict("fora_do_denominador");

      // Assert
      expect(verdict).toEqual({ label: "Fora do cálculo", tone: "neutral" });
    });
  });
});

describe("filterVotos", () => {
  describe("when the filter is 'todos'", () => {
    it("returns every voto regardless of effect", () => {
      // Arrange
      const votos = [
        voto("concordancia"),
        voto("discordancia"),
        voto("fora_do_denominador"),
      ];

      // Act
      const result = filterVotos(votos, "todos");

      // Assert
      expect(result).toEqual(votos);
    });
  });

  describe("when the filter targets a single effect", () => {
    it("keeps only the votos for the matching effect", () => {
      // Arrange
      const alinhado = voto("concordancia");
      const divergente = voto("discordancia");
      const fora = voto("fora_do_denominador");
      const votos = [alinhado, divergente, fora];

      // Act / Assert
      expect(filterVotos(votos, "alinhados")).toEqual([alinhado]);
      expect(filterVotos(votos, "divergentes")).toEqual([divergente]);
      expect(filterVotos(votos, "fora")).toEqual([fora]);
    });
  });

  describe("immutability", () => {
    it("does not mutate the input array", () => {
      // Arrange
      const votos = [voto("concordancia"), voto("discordancia")];
      const snapshot = [...votos];

      // Act
      filterVotos(votos, "alinhados");

      // Assert
      expect(votos).toEqual(snapshot);
    });
  });
});

describe("countVotosByFiltro", () => {
  describe("when votos span every effect", () => {
    it("counts each filter plus the total", () => {
      // Arrange
      const votos = [
        voto("concordancia"),
        voto("concordancia"),
        voto("discordancia"),
        voto("fora_do_denominador"),
      ];

      // Act
      const counts = countVotosByFiltro(votos);

      // Assert
      expect(counts).toEqual({
        todos: 4,
        alinhados: 2,
        divergentes: 1,
        fora: 1,
      });
    });
  });

  describe("when votos is empty", () => {
    it("returns zero for every filter", () => {
      // Act
      const counts = countVotosByFiltro([]);

      // Assert
      expect(counts).toEqual({
        todos: 0,
        alinhados: 0,
        divergentes: 0,
        fora: 0,
      });
    });
  });
});

describe("sortVotosByVotacaoDataDesc", () => {
  describe("when votos have distinct votação dates", () => {
    it("orders the most recent votação first", () => {
      // Arrange
      const older = voto("concordancia", "sim", "aprovar", "2020-01-01");
      const newer = voto("concordancia", "sim", "aprovar", "2024-06-01");
      const middle = voto("concordancia", "sim", "aprovar", "2022-03-15");

      // Act
      const result = sortVotosByVotacaoDataDesc([older, newer, middle]);

      // Assert
      expect(result).toEqual([newer, middle, older]);
    });
  });

  describe("when some votos have no votação date", () => {
    it("places votos without a date last", () => {
      // Arrange
      const dated = voto("concordancia", "sim", "aprovar", "2021-05-10");
      const undated = voto("concordancia", "sim", "aprovar", null);

      // Act
      const result = sortVotosByVotacaoDataDesc([undated, dated]);

      // Assert
      expect(result).toEqual([dated, undated]);
    });
  });

  describe("immutability", () => {
    it("returns a new array without mutating the input", () => {
      // Arrange
      const votos = [
        voto("concordancia", "sim", "aprovar", "2020-01-01"),
        voto("concordancia", "sim", "aprovar", "2024-06-01"),
      ];
      const snapshot = [...votos];

      // Act
      const result = sortVotosByVotacaoDataDesc(votos);

      // Assert
      expect(votos).toEqual(snapshot);
      expect(result).not.toBe(votos);
    });
  });
});

describe("toFiltroLabel", () => {
  const cases: [Parameters<typeof toFiltroLabel>[0], string][] = [
    ["todos", "Todos"],
    ["alinhados", "Alinhados"],
    ["divergentes", "Divergentes"],
    ["fora", "Fora do cálculo"],
  ];

  for (const [filtro, expected] of cases) {
    it(`maps '${filtro}' to '${expected}'`, () => {
      // Act / Assert
      expect(toFiltroLabel(filtro)).toBe(expected);
    });
  }
});

describe("FORA_DO_DENOMINADOR_EXPLICACAO", () => {
  it("is a non-empty explanatory string", () => {
    // Act / Assert
    expect(typeof FORA_DO_DENOMINADOR_EXPLICACAO).toBe("string");
    expect(FORA_DO_DENOMINADOR_EXPLICACAO.length).toBeGreaterThan(0);
  });
});

describe("formatAmostraComparavel", () => {
  describe("when there are no comparable votações", () => {
    it("states the absence in plain language", () => {
      // Act / Assert
      expect(formatAmostraComparavel(0)).toBe("sem votações comparáveis");
    });
  });

  describe("when there is exactly one comparable votação", () => {
    it("uses the singular noun", () => {
      // Act / Assert
      expect(formatAmostraComparavel(1)).toBe("em 1 votação comparável");
    });
  });

  describe("when there are several comparable votações", () => {
    it("uses the plural noun", () => {
      // Act / Assert
      expect(formatAmostraComparavel(4)).toBe("em 4 votações comparáveis");
    });
  });
});

describe("AMOSTRA_PEQUENA_CAVEAT", () => {
  it("is a non-empty cautionary string", () => {
    // Act / Assert
    expect(typeof AMOSTRA_PEQUENA_CAVEAT).toBe("string");
    expect(AMOSTRA_PEQUENA_CAVEAT.length).toBeGreaterThan(0);
  });
});
