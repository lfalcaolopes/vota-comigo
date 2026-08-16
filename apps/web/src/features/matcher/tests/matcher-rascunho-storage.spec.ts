import type { PosicaoUsuarioMatcher } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  clearRascunho,
  loadRascunho,
  saveRascunho,
  type RascunhoStorage,
} from "../lib/matcher-rascunho-storage";

describe("Persistência do rascunho de execução do matcher", () => {
  describe("quando as entradas mudam na aba atual", () => {
    it("torna o rascunho disponível para retomada", () => {
      // Arrange
      const values = new Map<string, string>();
      const storage: RascunhoStorage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      };
      const rascunho = {
        siglaUf: "CE" as const,
        escopo: "estadual" as const,
        selected: [],
        posicoes: new Map<number, PosicaoUsuarioMatcher>(),
        externalIdProposicoesFiltroConcordancia: [],
      };

      // Act
      saveRascunho(storage, rascunho);
      const loaded = loadRascunho(storage);

      // Assert
      expect(loaded).toEqual(rascunho);
    });
  });

  describe("quando o usuário decide começar novamente", () => {
    it("remove o rascunho da aba atual", () => {
      // Arrange
      const values = new Map<string, string>();
      const storage: RascunhoStorage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      };
      saveRascunho(storage, {
        siglaUf: "CE",
        escopo: "estadual",
        selected: [],
        posicoes: new Map(),
        externalIdProposicoesFiltroConcordancia: [],
      });

      // Act
      clearRascunho(storage);

      // Assert
      expect(loadRascunho(storage)).toBeNull();
    });
  });
});
