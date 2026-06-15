import { describe, expect, it } from '@jest/globals';

import type { ProposicaoTemaRow } from '../rules/temas-disponiveis';
import { toTemasDisponiveis } from '../rules/temas-disponiveis';

function temaRow(
  externalIdProposicao: number,
  externalCodTema: number,
  tema: string | null,
): ProposicaoTemaRow {
  return { externalIdProposicao, externalCodTema, tema };
}

describe('toTemasDisponiveis', () => {
  describe('when a tema has no text (null)', () => {
    it('excludes temas without public text', () => {
      // Arrange
      const rows = [temaRow(1, 10, null), temaRow(1, 20, 'Saúde')];
      const computaveis = new Set([1]);

      // Act
      const result = toTemasDisponiveis(rows, computaveis);

      // Assert
      expect(result.map((t) => t.externalCodTema)).not.toContain(10);
      expect(result.map((t) => t.externalCodTema)).toContain(20);
    });
  });

  describe('when a tema has no proposicao computavel', () => {
    it('excludes temas whose only proposicoes are not computaveis', () => {
      // Arrange
      const rows = [temaRow(99, 10, 'Educação'), temaRow(1, 20, 'Saúde')];
      const computaveis = new Set([1]);

      // Act
      const result = toTemasDisponiveis(rows, computaveis);

      // Assert
      expect(result.map((t) => t.externalCodTema)).not.toContain(10);
      expect(result.map((t) => t.externalCodTema)).toContain(20);
    });
  });

  describe('when a tema appears in both computavel and non-computavel proposicoes', () => {
    it('includes the tema because at least one proposicao is computavel', () => {
      // Arrange
      const rows = [temaRow(99, 10, 'Educação'), temaRow(1, 10, 'Educação')];
      const computaveis = new Set([1]);

      // Act
      const result = toTemasDisponiveis(rows, computaveis);

      // Assert
      expect(result.map((t) => t.externalCodTema)).toContain(10);
    });
  });

  describe('when multiple proposicoes share the same tema', () => {
    it('deduplicates by externalCodTema', () => {
      // Arrange
      const rows = [temaRow(1, 10, 'Saúde'), temaRow(2, 10, 'Saúde')];
      const computaveis = new Set([1, 2]);

      // Act
      const result = toTemasDisponiveis(rows, computaveis);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].externalCodTema).toBe(10);
    });
  });

  describe('ordering', () => {
    it('sorts alphabetically by tema (pt-BR locale)', () => {
      // Arrange
      const rows = [
        temaRow(1, 30, 'Saúde'),
        temaRow(2, 20, 'Administração Pública'),
        temaRow(3, 10, 'Educação'),
      ];
      const computaveis = new Set([1, 2, 3]);

      // Act
      const result = toTemasDisponiveis(rows, computaveis);

      // Assert
      expect(result.map((t) => t.tema)).toEqual([
        'Administração Pública',
        'Educação',
        'Saúde',
      ]);
    });

    it('breaks ties by externalCodTema ascending', () => {
      // Arrange
      const rows = [temaRow(1, 30, 'Saúde'), temaRow(2, 10, 'Saúde')];
      const computaveis = new Set([1, 2]);

      // Act
      const result = toTemasDisponiveis(rows, computaveis);

      // Assert
      expect(result.map((t) => t.externalCodTema)).toEqual([10, 30]);
    });
  });

  describe('when there are no tema rows', () => {
    it('returns an empty array', () => {
      // Arrange / Act
      const result = toTemasDisponiveis([], new Set([1]));

      // Assert
      expect(result).toEqual([]);
    });
  });
});
