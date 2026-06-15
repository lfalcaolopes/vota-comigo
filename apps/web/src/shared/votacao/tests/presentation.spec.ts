import type { PlacarVotacao, VotacaoNominal } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  sortByDataDesc,
  toComparadorLabel,
  toPlacarCategorias,
  toPlacarResumidoLabel,
  toResultadoLabel,
  toResultadoTone,
} from "../presentation";

function makeVotacao(overrides: Partial<VotacaoNominal> = {}): VotacaoNominal {
  return {
    externalIdVotacao: "abc-123",
    data: "2024-06-10",
    descricao: "Votação sobre o projeto.",
    placar: {
      placarCompleto: false,
      votosSim: 10,
      votosNao: 5,
      votosOutros: 2,
    },
    resultado: "aprovada",
    isReferenciaMatcher: false,
    ...overrides,
  };
}

describe("toResultadoLabel", () => {
  describe("when resultado is aprovada", () => {
    it("returns 'Aprovada'", () => {
      // Act / Assert
      expect(toResultadoLabel("aprovada")).toBe("Aprovada");
    });
  });

  describe("when resultado is rejeitada", () => {
    it("returns 'Rejeitada'", () => {
      // Act / Assert
      expect(toResultadoLabel("rejeitada")).toBe("Rejeitada");
    });
  });

  describe("when resultado is indisponivel", () => {
    it("returns 'Indisponível' with accent", () => {
      // Act / Assert
      expect(toResultadoLabel("indisponivel")).toBe("Indisponível");
    });
  });
});

describe("toResultadoTone", () => {
  describe("when resultado is aprovada", () => {
    it("returns 'success'", () => {
      // Act / Assert
      expect(toResultadoTone("aprovada")).toBe("success");
    });
  });

  describe("when resultado is rejeitada", () => {
    it("returns 'danger'", () => {
      // Act / Assert
      expect(toResultadoTone("rejeitada")).toBe("danger");
    });
  });

  describe("when resultado is indisponivel", () => {
    it("returns 'neutral'", () => {
      // Act / Assert
      expect(toResultadoTone("indisponivel")).toBe("neutral");
    });

    it("does not return 'success'", () => {
      // Act / Assert
      expect(toResultadoTone("indisponivel")).not.toBe("success");
    });

    it("does not return 'danger'", () => {
      // Act / Assert
      expect(toResultadoTone("indisponivel")).not.toBe("danger");
    });
  });
});

describe("toComparadorLabel", () => {
  describe("when isReferenciaMatcher is true", () => {
    it("returns the comparador label", () => {
      // Arrange
      const votacao = makeVotacao({ isReferenciaMatcher: true });

      // Act / Assert
      expect(toComparadorLabel(votacao)).toBe("Votação usada no comparador");
    });
  });

  describe("when isReferenciaMatcher is false", () => {
    it("returns null", () => {
      // Arrange
      const votacao = makeVotacao({ isReferenciaMatcher: false });

      // Act / Assert
      expect(toComparadorLabel(votacao)).toBeNull();
    });
  });
});

describe("toPlacarCategorias", () => {
  describe("when placarCompleto is true", () => {
    const placar: PlacarVotacao = {
      placarCompleto: true,
      votosSim: 300,
      votosNao: 100,
      votosAbstencao: 5,
      votosObstrucao: 10,
      votosArtigo17: 2,
      votosNaoInformado: 1,
    };

    it("returns Sim and Não with success and danger tones", () => {
      // Act
      const categorias = toPlacarCategorias(placar);

      // Assert
      expect(categorias).toEqual([
        { label: "Sim", votos: 300, tone: "success" },
        { label: "Não", votos: 100, tone: "danger" },
      ]);
    });

    it("never includes Outros or other secondary categories", () => {
      // Act
      const categorias = toPlacarCategorias(placar);

      // Assert
      expect(categorias.map((c) => c.label)).toEqual(["Sim", "Não"]);
    });

    it("keeps Sim and Não even when their votes are 0", () => {
      // Arrange
      const zeroed: PlacarVotacao = { ...placar, votosSim: 0, votosNao: 0 };

      // Act
      const categorias = toPlacarCategorias(zeroed);

      // Assert
      expect(categorias.map((c) => c.votos)).toEqual([0, 0]);
    });
  });

  describe("when placarCompleto is false", () => {
    const placar: PlacarVotacao = {
      placarCompleto: false,
      votosSim: 10,
      votosNao: 5,
      votosOutros: 2,
    };

    it("returns only Sim and Não, ignoring votosOutros", () => {
      // Act
      const categorias = toPlacarCategorias(placar);

      // Assert
      expect(categorias).toEqual([
        { label: "Sim", votos: 10, tone: "success" },
        { label: "Não", votos: 5, tone: "danger" },
      ]);
    });
  });
});

describe("toPlacarResumidoLabel", () => {
  describe("when placarCompleto is false", () => {
    it("returns 'Placar resumido'", () => {
      // Arrange
      const placar: PlacarVotacao = {
        placarCompleto: false,
        votosSim: 10,
        votosNao: 5,
        votosOutros: 2,
      };

      // Act / Assert
      expect(toPlacarResumidoLabel(placar)).toBe("Placar resumido");
    });
  });

  describe("when placarCompleto is true", () => {
    it("returns null", () => {
      // Arrange
      const placar: PlacarVotacao = {
        placarCompleto: true,
        votosSim: 300,
        votosNao: 100,
        votosAbstencao: 0,
        votosObstrucao: 0,
        votosArtigo17: 0,
        votosNaoInformado: 0,
      };

      // Act / Assert
      expect(toPlacarResumidoLabel(placar)).toBeNull();
    });
  });
});

describe("sortByDataDesc", () => {
  describe("when all votacoes have data", () => {
    it("sorts from most recent to oldest", () => {
      // Arrange
      const votacoes = [
        makeVotacao({ externalIdVotacao: "a", data: "2023-01-15" }),
        makeVotacao({ externalIdVotacao: "b", data: "2025-06-10" }),
        makeVotacao({ externalIdVotacao: "c", data: "2024-03-20" }),
      ];

      // Act
      const sorted = sortByDataDesc(votacoes);

      // Assert
      expect(sorted.map((v) => v.externalIdVotacao)).toEqual(["b", "c", "a"]);
    });
  });

  describe("when some votacoes have null data", () => {
    it("places null-data votacoes at the end", () => {
      // Arrange
      const votacoes = [
        makeVotacao({ externalIdVotacao: "x", data: null }),
        makeVotacao({ externalIdVotacao: "y", data: "2024-01-01" }),
        makeVotacao({ externalIdVotacao: "z", data: null }),
      ];

      // Act
      const sorted = sortByDataDesc(votacoes);

      // Assert
      expect(sorted[0].externalIdVotacao).toBe("y");
      expect(sorted.slice(1).map((v) => v.externalIdVotacao)).toEqual(
        expect.arrayContaining(["x", "z"]),
      );
    });
  });

  describe("immutability", () => {
    it("does not mutate the original array", () => {
      // Arrange
      const votacoes = [
        makeVotacao({ externalIdVotacao: "a", data: "2023-01-15" }),
        makeVotacao({ externalIdVotacao: "b", data: "2025-06-10" }),
      ];
      const original = [...votacoes];

      // Act
      sortByDataDesc(votacoes);

      // Assert
      expect(votacoes).toEqual(original);
    });
  });
});
