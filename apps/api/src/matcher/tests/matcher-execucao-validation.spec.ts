import type { PosicaoMatcher } from '@vota-comigo/shared-types';

import { validateExecucao } from '../rules/matcher-execucao-validation';

function posicao(overrides: Partial<PosicaoMatcher> = {}): PosicaoMatcher {
  return {
    externalIdProposicao: 1,
    posicao: 'aprovar',
    ...overrides,
  };
}

describe('validateExecucao', () => {
  describe('when there are at least three computavel positions, all computaveis', () => {
    it('accepts the execution and summarizes the normalized totals', () => {
      // Arrange
      const posicoes = [
        posicao({ externalIdProposicao: 1, posicao: 'aprovar' }),
        posicao({
          externalIdProposicao: 2,
          posicao: 'rejeitar',
        }),
        posicao({ externalIdProposicao: 3, posicao: 'aprovar' }),
      ];

      // Act
      const result = validateExecucao({
        siglaUf: 'PE',
        cidade: 'Recife',
        posicoes,
        externalIdProposicoesComputaveis: new Set([1, 2, 3]),
      });

      // Assert
      expect(result).toEqual({
        ok: true,
        resumo: {
          siglaUf: 'PE',
          cidade: 'Recife',
          totalProposicoesSelecionadas: 3,
          totalPosicoesComputaveis: 3,
        },
      });
    });
  });

  describe('when nao_sei positions would be needed to reach three', () => {
    it('rejects the execution because nao_sei is ignored for the minimum', () => {
      // Arrange
      const posicoes = [
        posicao({ externalIdProposicao: 1, posicao: 'aprovar' }),
        posicao({
          externalIdProposicao: 2,
          posicao: 'rejeitar',
        }),
        posicao({ externalIdProposicao: 3, posicao: 'nao_sei' }),
      ];

      // Act
      const result = validateExecucao({
        siglaUf: 'PE',
        posicoes,
        externalIdProposicoesComputaveis: new Set([1, 2, 3]),
      });

      // Assert
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error('expected invalid matcher execucao');
      }
      expect(result.error).toContain('3');
    });
  });

  describe('when a computavel position points to a non-computavel proposicao', () => {
    it('rejects the execution naming the offending proposicao', () => {
      // Arrange
      const posicoes = [
        posicao({ externalIdProposicao: 1, posicao: 'aprovar' }),
        posicao({
          externalIdProposicao: 2,
          posicao: 'rejeitar',
        }),
        posicao({ externalIdProposicao: 99, posicao: 'aprovar' }),
      ];

      // Act
      const result = validateExecucao({
        siglaUf: 'PE',
        posicoes,
        externalIdProposicoesComputaveis: new Set([1, 2]),
      });

      // Assert
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error('expected invalid matcher execucao');
      }
      expect(result.error).toContain('99');
    });
  });

  describe('when a nao_sei position points to a non-computavel proposicao', () => {
    it('ignores it and accepts the execution', () => {
      // Arrange
      const posicoes = [
        posicao({ externalIdProposicao: 1, posicao: 'aprovar' }),
        posicao({
          externalIdProposicao: 2,
          posicao: 'rejeitar',
        }),
        posicao({ externalIdProposicao: 3, posicao: 'aprovar' }),
        posicao({ externalIdProposicao: 99, posicao: 'nao_sei' }),
      ];

      // Act
      const result = validateExecucao({
        siglaUf: 'PE',
        posicoes,
        externalIdProposicoesComputaveis: new Set([1, 2, 3]),
      });

      // Assert
      expect(result).toMatchObject({
        ok: true,
        resumo: {
          totalProposicoesSelecionadas: 4,
          totalPosicoesComputaveis: 3,
        },
      });
    });
  });
});
