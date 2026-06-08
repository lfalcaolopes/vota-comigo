import type { PosicaoMatcher } from '@vota-comigo/shared-types';

import { validateExecucao } from '../rules/matcher-execucao-validation';

function posicao(overrides: Partial<PosicaoMatcher> = {}): PosicaoMatcher {
  return {
    externalIdProposicao: 1,
    posicao: 'deveria_ser_aprovada',
    ...overrides,
  };
}

describe('validateExecucao', () => {
  describe('when there are at least three computavel positions, all computaveis', () => {
    it('accepts the execution and summarizes the normalized totals', () => {
      // Arrange
      const posicoes = [
        posicao({ externalIdProposicao: 1, posicao: 'deveria_ser_aprovada' }),
        posicao({
          externalIdProposicao: 2,
          posicao: 'nao_deveria_ser_aprovada',
        }),
        posicao({ externalIdProposicao: 3, posicao: 'deveria_ser_aprovada' }),
      ];

      // Act
      const result = validateExecucao({
        siglaUf: 'PE',
        cidade: 'Recife',
        posicoes,
        computaveis: new Set([1, 2, 3]),
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
        posicao({ externalIdProposicao: 1, posicao: 'deveria_ser_aprovada' }),
        posicao({
          externalIdProposicao: 2,
          posicao: 'nao_deveria_ser_aprovada',
        }),
        posicao({ externalIdProposicao: 3, posicao: 'nao_sei' }),
      ];

      // Act
      const result = validateExecucao({
        siglaUf: 'PE',
        posicoes,
        computaveis: new Set([1, 2, 3]),
      });

      // Assert
      expect(result.ok).toBe(false);
      expect(result).toMatchObject({
        ok: false,
        error: expect.stringContaining('3'),
      });
    });
  });

  describe('when a computavel position points to a non-computavel proposicao', () => {
    it('rejects the execution naming the offending proposicao', () => {
      // Arrange
      const posicoes = [
        posicao({ externalIdProposicao: 1, posicao: 'deveria_ser_aprovada' }),
        posicao({
          externalIdProposicao: 2,
          posicao: 'nao_deveria_ser_aprovada',
        }),
        posicao({ externalIdProposicao: 99, posicao: 'deveria_ser_aprovada' }),
      ];

      // Act
      const result = validateExecucao({
        siglaUf: 'PE',
        posicoes,
        computaveis: new Set([1, 2]),
      });

      // Assert
      expect(result).toMatchObject({
        ok: false,
        error: expect.stringContaining('99'),
      });
    });
  });

  describe('when a nao_sei position points to a non-computavel proposicao', () => {
    it('ignores it and accepts the execution', () => {
      // Arrange
      const posicoes = [
        posicao({ externalIdProposicao: 1, posicao: 'deveria_ser_aprovada' }),
        posicao({
          externalIdProposicao: 2,
          posicao: 'nao_deveria_ser_aprovada',
        }),
        posicao({ externalIdProposicao: 3, posicao: 'deveria_ser_aprovada' }),
        posicao({ externalIdProposicao: 99, posicao: 'nao_sei' }),
      ];

      // Act
      const result = validateExecucao({
        siglaUf: 'PE',
        posicoes,
        computaveis: new Set([1, 2, 3]),
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
