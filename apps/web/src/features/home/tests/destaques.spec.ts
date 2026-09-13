import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { pickDestaques, type Destaque } from "../lib/destaques";

function card(externalIdProposicao: number): ProposicaoCard {
  return { externalIdProposicao } as ProposicaoCard;
}

function resumo(destaques: readonly Destaque[]) {
  return destaques.map(({ card: item, topic }) => [
    item.externalIdProposicao,
    topic,
  ]);
}

describe("destaques de propostas da home", () => {
  describe("quando os assuntos têm resultado", () => {
    it("segue a ordem dos assuntos até o limite, com o assunto de cada um", () => {
      // Arrange
      const byTopic = [
        { topic: "Trabalho 6x1", card: card(1) },
        { topic: "Porte de arma", card: card(2) },
        { topic: "Reforma da Previdência", card: card(3) },
        { topic: "Cotas para negros", card: card(4) },
      ];

      // Act
      const picked = pickDestaques(byTopic, [card(9)], 3);

      // Assert
      expect(resumo(picked)).toEqual([
        [1, "Trabalho 6x1"],
        [2, "Porte de arma"],
        [3, "Reforma da Previdência"],
      ]);
    });
  });

  describe("quando um assunto não tem resultado", () => {
    it("completa a vaga com a lista geral, sem inventar assunto", () => {
      // Arrange
      const byTopic = [
        { topic: "Trabalho 6x1", card: card(1) },
        { topic: "Impunidade de deputados", card: null },
        { topic: "Porte de arma", card: card(3) },
      ];

      // Act
      const picked = pickDestaques(byTopic, [card(8), card(9)], 3);

      // Assert
      expect(resumo(picked)).toEqual([
        [1, "Trabalho 6x1"],
        [3, "Porte de arma"],
        [8, null],
      ]);
    });
  });

  describe("quando dois assuntos trazem a mesma proposta", () => {
    it("mostra a proposta uma vez só, com o primeiro assunto", () => {
      // Arrange
      const byTopic = [
        { topic: "Trabalho 6x1", card: card(1) },
        { topic: "Porte de arma", card: card(1) },
        { topic: "Reforma da Previdência", card: card(2) },
      ];

      // Act
      const picked = pickDestaques(byTopic, [card(2), card(7)], 3);

      // Assert
      expect(resumo(picked)).toEqual([
        [1, "Trabalho 6x1"],
        [2, "Reforma da Previdência"],
        [7, null],
      ]);
    });
  });
});
