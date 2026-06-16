import { deriveEscopoVotacao, isPlenario } from './escopo-votacao';

describe('escopo de votacao', () => {
  describe('when deriving escopo from siglaOrgao', () => {
    it('resolves plenario for the plenary chambers PLEN and CN', () => {
      // Arrange / Act / Assert
      expect(deriveEscopoVotacao('PLEN')).toBe('plenario');
      expect(deriveEscopoVotacao('CN')).toBe('plenario');
    });

    it('resolves comissao for any committee siglaOrgao', () => {
      // Arrange / Act / Assert
      expect(deriveEscopoVotacao('CCJC')).toBe('comissao');
      expect(deriveEscopoVotacao('CFT')).toBe('comissao');
    });

    it('resolves comissao when siglaOrgao is missing', () => {
      // Arrange / Act / Assert
      expect(deriveEscopoVotacao(null)).toBe('comissao');
      expect(deriveEscopoVotacao('')).toBe('comissao');
    });
  });

  describe('when checking plenary membership', () => {
    it('is true only for plenary chambers and tolerates absent siglaOrgao', () => {
      // Arrange / Act / Assert
      expect(isPlenario('PLEN')).toBe(true);
      expect(isPlenario('CN')).toBe(true);
      expect(isPlenario('CCJC')).toBe(false);
      expect(isPlenario(null)).toBe(false);
      expect(isPlenario(undefined)).toBe(false);
    });
  });
});
