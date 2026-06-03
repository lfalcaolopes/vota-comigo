import { comparePlacar } from './sanity.checker';
import type { PlacarComparisonRow } from './sanity.repository.types';

function comparisonRow(
  overrides: Partial<PlacarComparisonRow> = {},
): PlacarComparisonRow {
  return {
    externalIdVotacao: '2265603-43',
    votosSimOficial: 300,
    votosNaoOficial: 100,
    votosSimDerivado: 300,
    votosNaoDerivado: 100,
    outrosDerivado: {
      abstencao: 0,
      obstrucao: 0,
      artigo17: 0,
      naoInformado: 0,
    },
    ...overrides,
  };
}

describe('comparePlacar', () => {
  describe('when the official tally matches the derived counts', () => {
    it('reports no divergence', () => {
      // Arrange
      const row = comparisonRow();

      // Act
      const comparison = comparePlacar(row);

      // Assert
      expect(comparison.status).toBe('ok');
    });
  });

  describe('when the sim count diverges', () => {
    it('flags a divergence carrying both sim values', () => {
      // Arrange
      const row = comparisonRow({
        votosSimOficial: 300,
        votosSimDerivado: 298,
      });

      // Act
      const comparison = comparePlacar(row);

      // Assert
      expect(comparison).toEqual({
        status: 'divergente',
        divergence: {
          externalIdVotacao: '2265603-43',
          votosSimOficial: 300,
          votosSimDerivado: 298,
          votosNaoOficial: 100,
          votosNaoDerivado: 100,
        },
      });
    });
  });

  describe('when the nao count diverges', () => {
    it('flags a divergence carrying both nao values', () => {
      // Arrange
      const row = comparisonRow({
        votosNaoOficial: 100,
        votosNaoDerivado: 101,
      });

      // Act
      const comparison = comparePlacar(row);

      // Assert
      expect(comparison).toMatchObject({
        status: 'divergente',
        divergence: { votosNaoOficial: 100, votosNaoDerivado: 101 },
      });
    });
  });

  describe('when the official tally has votes but the source carries no individual directions', () => {
    it('classifies it as missing individual votes, not a divergence', () => {
      // Arrange: placar oficial com votos, mas todos os votos derivados em branco
      const row = comparisonRow({
        votosSimOficial: 322,
        votosNaoOficial: 18,
        votosSimDerivado: 0,
        votosNaoDerivado: 0,
        outrosDerivado: {
          abstencao: 0,
          obstrucao: 0,
          artigo17: 0,
          naoInformado: 340,
        },
      });

      // Act
      const comparison = comparePlacar(row);

      // Assert
      expect(comparison).toEqual({
        status: 'votos_ausentes',
        semVotos: {
          externalIdVotacao: '2265603-43',
          votosSimOficial: 322,
          votosNaoOficial: 18,
          votosNaoInformadoDerivado: 340,
        },
      });
    });
  });

  describe('when some derived votes carry a direction but the totals still mismatch', () => {
    it('stays a divergence rather than a missing-votes gap', () => {
      // Arrange: parte dos votos tem direção, então não é "tudo em branco"
      const row = comparisonRow({
        votosSimOficial: 322,
        votosNaoOficial: 18,
        votosSimDerivado: 300,
        votosNaoDerivado: 0,
        outrosDerivado: {
          abstencao: 0,
          obstrucao: 0,
          artigo17: 0,
          naoInformado: 40,
        },
      });

      // Act
      const comparison = comparePlacar(row);

      // Assert
      expect(comparison.status).toBe('divergente');
    });
  });

  describe('when the official tally is absent', () => {
    it('is not comparable rather than divergent', () => {
      // Arrange
      const row = comparisonRow({
        votosSimOficial: null,
        votosNaoOficial: null,
      });

      // Act
      const comparison = comparePlacar(row);

      // Assert
      expect(comparison.status).toBe('incomparavel');
    });
  });
});
