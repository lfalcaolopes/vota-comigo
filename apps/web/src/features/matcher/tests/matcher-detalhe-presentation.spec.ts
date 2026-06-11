import type {
  DeputadoVotacaoClassification,
  MatcherEffect,
  MatcherVotoDetalhe,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  FORA_DO_DENOMINADOR_EXPLICACAO,
  groupVotosByMatcherEffect,
  toMatcherEffectLabel,
  toPosicaoLabel,
  toSituacaoLabel,
} from "../lib/matcher-detalhe-presentation";

function voto(
  matcherEffect: MatcherEffect,
  situacao: DeputadoVotacaoClassification = "sim",
  posicaoUsuario: "aprovar" | "rejeitar" = "aprovar",
): MatcherVotoDetalhe {
  return {
    proposicao: {
      externalIdProposicao: Math.floor(Math.random() * 10000),
      siglaTipo: "PL",
      numero: 1,
      ano: 2024,
      ementa: "Ementa teste",
      dataApresentacao: "2024-01-01",
      volumeVotacoesPlenario: 1,
      dataUltimaVotacao: "2024-06-01",
    },
    posicaoUsuario,
    votacaoReferencia: {
      externalIdVotacao: "abc123",
      data: "2024-06-01",
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

describe("FORA_DO_DENOMINADOR_EXPLICACAO", () => {
  it("is a non-empty explanatory string", () => {
    // Act / Assert
    expect(typeof FORA_DO_DENOMINADOR_EXPLICACAO).toBe("string");
    expect(FORA_DO_DENOMINADOR_EXPLICACAO.length).toBeGreaterThan(0);
  });
});
