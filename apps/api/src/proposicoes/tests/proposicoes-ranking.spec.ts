import type { ClassifiedVotacao } from '@/matcher/rules/votacao-referencia';

import type {
  ProposicaoWithVotacoes,
  RankedProposicao,
} from '../types/proposicoes.types';
import {
  compareDataApresentacao,
  compareRanking,
  selectComparator,
} from '../rules/proposicoes-ranking';

function ranked(
  overrides: {
    externalIdProposicao?: number;
    dataApresentacao?: string | null;
    ano?: number | null;
    numero?: number | null;
    siglaTipo?: string | null;
    volumeVotacoesPlenario?: number;
  } = {},
): RankedProposicao {
  const {
    externalIdProposicao = 1,
    dataApresentacao = '2024-01-01T00:00:00Z',
    ano = 2024,
    numero = 100,
    siglaTipo = 'PL',
    volumeVotacoesPlenario = 1,
  } = overrides;

  const proposicao: ProposicaoWithVotacoes = {
    externalIdProposicao,
    siglaTipo,
    numero,
    ano,
    ementa: null,
    dataApresentacao,
    ultimoStatusSiglaOrgao: null,
    ultimoStatusDescricaoSituacao: null,
    ultimoStatusRegime: null,
    ultimoStatusDataHora: null,
    votacoesPlenario: [],
  };

  return {
    proposicao,
    volumeVotacoesPlenario,
    referencia: {} as ClassifiedVotacao,
  };
}

describe('compareDataApresentacao', () => {
  describe('when items have different dataApresentacao', () => {
    it('sorts later dates first (descending)', () => {
      // Arrange
      const older = ranked({
        externalIdProposicao: 1,
        dataApresentacao: '2022-01-01T00:00:00Z',
      });
      const newer = ranked({
        externalIdProposicao: 2,
        dataApresentacao: '2024-01-01T00:00:00Z',
      });

      // Act
      const sorted = [older, newer].sort(compareDataApresentacao);

      // Assert
      expect(sorted.map((r) => r.proposicao.externalIdProposicao)).toEqual([
        2, 1,
      ]);
    });
  });

  describe('when one item has no dataApresentacao', () => {
    it('puts items without a date at the end', () => {
      // Arrange
      const withDate = ranked({
        externalIdProposicao: 1,
        dataApresentacao: '2024-01-01T00:00:00Z',
      });
      const nullDate = ranked({
        externalIdProposicao: 2,
        dataApresentacao: null,
      });

      // Act
      const sorted = [nullDate, withDate].sort(compareDataApresentacao);

      // Assert
      expect(sorted.map((r) => r.proposicao.externalIdProposicao)).toEqual([
        1, 2,
      ]);
    });

    it('puts two null-date items after all dated items, keeping them stable via tie-break', () => {
      // Arrange
      const withDate = ranked({
        externalIdProposicao: 1,
        dataApresentacao: '2023-06-15T00:00:00Z',
      });
      const nullA = ranked({
        externalIdProposicao: 2,
        dataApresentacao: null,
        ano: 2023,
        numero: 10,
      });
      const nullB = ranked({
        externalIdProposicao: 3,
        dataApresentacao: null,
        ano: 2024,
        numero: 5,
      });

      // Act
      const sorted = [nullA, nullB, withDate].sort(compareDataApresentacao);

      // Assert: dated item first; nulls resolved by tie-break (ano desc → 2024 first)
      expect(sorted.map((r) => r.proposicao.externalIdProposicao)).toEqual([
        1, 3, 2,
      ]);
    });
  });

  describe('when items share the same dataApresentacao', () => {
    it('breaks ties by ano desc, numero desc, siglaTipo asc, externalIdProposicao asc', () => {
      // Arrange
      const base = { dataApresentacao: '2024-03-10T00:00:00Z' };
      const items = [
        ranked({
          ...base,
          externalIdProposicao: 10,
          ano: 2023,
          numero: 5,
          siglaTipo: 'PL',
        }),
        ranked({
          ...base,
          externalIdProposicao: 11,
          ano: 2024,
          numero: 5,
          siglaTipo: 'PL',
        }),
        ranked({
          ...base,
          externalIdProposicao: 12,
          ano: 2024,
          numero: 9,
          siglaTipo: 'PL',
        }),
      ];

      // Act
      const sorted = [...items].sort(compareDataApresentacao);

      // Assert
      expect(sorted.map((r) => r.proposicao.externalIdProposicao)).toEqual([
        12, 11, 10,
      ]);
    });
  });
});

describe('selectComparator', () => {
  describe('when ordenacao is mais-votadas', () => {
    it('returns the compareRanking comparator', () => {
      // Act / Assert
      expect(selectComparator('mais-votadas')).toBe(compareRanking);
    });
  });

  describe('when ordenacao is mais-recentes', () => {
    it('returns the compareDataApresentacao comparator', () => {
      // Act / Assert
      expect(selectComparator('mais-recentes')).toBe(compareDataApresentacao);
    });
  });
});
