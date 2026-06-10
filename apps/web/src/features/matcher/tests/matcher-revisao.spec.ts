import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  buildRevisaoItems,
  posicaoLabel,
} from "../lib/matcher-revisao";

function makeCard(id: number): ProposicaoCard {
  return {
    externalIdProposicao: id,
    siglaTipo: "PL",
    numero: id,
    ano: 2024,
    ementa: `Ementa da proposicao ${id}`,
    dataApresentacao: "2024-01-01",
    volumeVotacoesPlenario: 1,
    dataUltimaVotacao: null,
  };
}

function posicoesMap(
  entries: [number, PosicaoUsuarioMatcher][],
): Map<number, PosicaoUsuarioMatcher> {
  return new Map(entries);
}

describe("buildRevisaoItems", () => {
  describe("when the selected list is empty", () => {
    it("returns an empty array", () => {
      // Arrange
      const selected: ProposicaoCard[] = [];
      const posicoes = posicoesMap([]);

      // Act
      const items = buildRevisaoItems(selected, posicoes);

      // Assert
      expect(items).toEqual([]);
    });
  });

  describe("when a proposicao has no recorded position", () => {
    it("marks the item as pending with null posicao and non-computable", () => {
      // Arrange
      const card = makeCard(1);
      const posicoes = posicoesMap([]);

      // Act
      const [item] = buildRevisaoItems([card], posicoes);

      // Assert
      expect(item.card).toBe(card);
      expect(item.posicao).toBeNull();
      expect(item.computavel).toBe(false);
    });
  });

  describe('when a proposicao has posicao "aprovar"', () => {
    it("is marked as computable", () => {
      // Arrange
      const card = makeCard(1);
      const posicoes = posicoesMap([[1, "aprovar"]]);

      // Act
      const [item] = buildRevisaoItems([card], posicoes);

      // Assert
      expect(item.posicao).toBe("aprovar");
      expect(item.computavel).toBe(true);
    });
  });

  describe('when a proposicao has posicao "rejeitar"', () => {
    it("is marked as computable", () => {
      // Arrange
      const card = makeCard(2);
      const posicoes = posicoesMap([[2, "rejeitar"]]);

      // Act
      const [item] = buildRevisaoItems([card], posicoes);

      // Assert
      expect(item.posicao).toBe("rejeitar");
      expect(item.computavel).toBe(true);
    });
  });

  describe('when a proposicao has posicao "nao_sei"', () => {
    it("is not marked as computable", () => {
      // Arrange
      const card = makeCard(3);
      const posicoes = posicoesMap([[3, "nao_sei"]]);

      // Act
      const [item] = buildRevisaoItems([card], posicoes);

      // Assert
      expect(item.posicao).toBe("nao_sei");
      expect(item.computavel).toBe(false);
    });
  });

  describe("when there are multiple proposicoes in mixed states", () => {
    it("preserves the order from the selected array", () => {
      // Arrange
      const cards = [makeCard(10), makeCard(20), makeCard(30)];
      const posicoes = posicoesMap([
        [20, "rejeitar"],
        [10, "aprovar"],
      ]);

      // Act
      const items = buildRevisaoItems(cards, posicoes);

      // Assert
      expect(items.map((i) => i.card.externalIdProposicao)).toEqual([10, 20, 30]);
      expect(items[0].posicao).toBe("aprovar");
      expect(items[1].posicao).toBe("rejeitar");
      expect(items[2].posicao).toBeNull();
    });

    it("sets computavel correctly for each state", () => {
      // Arrange
      const cards = [makeCard(1), makeCard(2), makeCard(3), makeCard(4)];
      const posicoes = posicoesMap([
        [1, "aprovar"],
        [2, "rejeitar"],
        [3, "nao_sei"],
      ]);

      // Act
      const items = buildRevisaoItems(cards, posicoes);

      // Assert
      expect(items[0].computavel).toBe(true);
      expect(items[1].computavel).toBe(true);
      expect(items[2].computavel).toBe(false);
      expect(items[3].computavel).toBe(false);
    });
  });
});

describe("posicaoLabel", () => {
  it('returns the label for "aprovar"', () => {
    expect(posicaoLabel("aprovar")).toBe("Deveria ser aprovada");
  });

  it('returns the label for "rejeitar"', () => {
    expect(posicaoLabel("rejeitar")).toBe("Não deveria ser aprovada");
  });

  it('returns the label for "nao_sei"', () => {
    expect(posicaoLabel("nao_sei")).toBe("Não sei");
  });

  it("returns the label for a pending (null) posicao", () => {
    expect(posicaoLabel(null)).toBe("A decidir");
  });
});
