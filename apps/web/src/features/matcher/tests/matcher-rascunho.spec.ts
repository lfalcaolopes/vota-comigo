import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  parseRascunho,
  serializeRascunho,
} from "../lib/matcher-rascunho";

const selected: ProposicaoCard[] = [
  {
    externalIdProposicao: 123,
    siglaTipo: "PL",
    numero: 10,
    ano: 2026,
    ementa: "Altera a legislação eleitoral.",
    resumoIaDisponivel: true,
    resumoIaCard: "Resumo da proposição.",
    dataApresentacao: "2026-03-10T12:00:00.000Z",
    volumeVotacoesPlenario: 4,
    dataUltimaVotacao: "2026-06-15T18:30:00.000Z",
  },
];

describe("Rascunho de execução do matcher", () => {
  describe("quando todas as entradas foram preenchidas", () => {
    it("preserva as entradas e posições após serializar e reler", () => {
      // Arrange
      const posicoes = new Map<number, PosicaoUsuarioMatcher>([
        [123, "aprovar"],
      ]);

      // Act
      const serialized = serializeRascunho({
        siglaUf: "SP",
        cidade: "Campinas",
        escopo: "nacional",
        selected,
        posicoes,
      });
      const parsed = parseRascunho(serialized);

      // Assert
      expect(parsed).toEqual({
        siglaUf: "SP",
        cidade: "Campinas",
        escopo: "nacional",
        selected,
        posicoes,
      });
    });
  });

  describe("quando o preenchimento ainda não começou", () => {
    it("trata o rascunho vazio como válido", () => {
      // Arrange
      const emptyRascunho = {
        siglaUf: null,
        cidade: "",
        escopo: "estadual" as const,
        selected: [],
        posicoes: new Map<number, PosicaoUsuarioMatcher>(),
      };

      // Act
      const parsed = parseRascunho(serializeRascunho(emptyRascunho));

      // Assert
      expect(parsed).toEqual(emptyRascunho);
    });
  });

  describe("quando somente o local foi preenchido", () => {
    it("trata o rascunho parcial como válido", () => {
      // Arrange
      const partialRascunho = {
        siglaUf: "PE" as const,
        cidade: "Recife",
        escopo: "estadual" as const,
        selected: [],
        posicoes: new Map<number, PosicaoUsuarioMatcher>(),
      };

      // Act
      const parsed = parseRascunho(serializeRascunho(partialRascunho));

      // Assert
      expect(parsed).toEqual(partialRascunho);
    });
  });

  describe("quando o conteúdo não é JSON válido", () => {
    it("descarta o rascunho sem lançar erro", () => {
      // Arrange
      const malformed = "{nao-e-json";

      // Act
      const parse = () => parseRascunho(malformed);

      // Assert
      expect(parse).not.toThrow();
      expect(parse()).toBeNull();
    });
  });

  describe("quando o formato pertence a uma versão anterior", () => {
    it("descarta o rascunho", () => {
      // Arrange
      const outdated = JSON.stringify({
        version: 0,
        siglaUf: "SP",
        cidade: "Campinas",
        escopo: "estadual",
        selected: [],
        posicoes: [],
      });

      // Act
      const parsed = parseRascunho(outdated);

      // Assert
      expect(parsed).toBeNull();
    });
  });

  describe("quando uma entrada viola o contrato compartilhado", () => {
    it("descarta o rascunho", () => {
      // Arrange
      const invalid = JSON.stringify({
        version: 1,
        siglaUf: "XX",
        cidade: "Cidade inexistente",
        escopo: "estadual",
        selected: [],
        posicoes: [],
      });

      // Act
      const parsed = parseRascunho(invalid);

      // Assert
      expect(parsed).toBeNull();
    });
  });

  describe("quando o estado contém dados derivados", () => {
    it("serializa somente as entradas do usuário", () => {
      // Arrange
      const stateWithDerivedData = {
        siglaUf: "SP" as const,
        cidade: "Campinas",
        escopo: "estadual" as const,
        selected,
        posicoes: new Map<number, PosicaoUsuarioMatcher>([
          [123, "aprovar"],
        ]),
        resultados: { estadual: { deputados: [] } },
        detalhe: { externalIdDeputado: 456 },
        comparativo: [456, 789],
        perfis: [{ externalIdDeputado: 456 }],
      };

      // Act
      const serialized = JSON.parse(serializeRascunho(stateWithDerivedData));

      // Assert
      expect(serialized).toEqual({
        version: 1,
        siglaUf: "SP",
        cidade: "Campinas",
        escopo: "estadual",
        selected,
        posicoes: [{ externalIdProposicao: 123, posicao: "aprovar" }],
      });
    });
  });
});
