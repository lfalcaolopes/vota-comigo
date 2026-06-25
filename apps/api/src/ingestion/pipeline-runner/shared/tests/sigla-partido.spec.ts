import { normalizeSiglaPartido } from '../sigla-partido';

describe('normalizeSiglaPartido', () => {
  describe('when the sigla carries trailing asterisk markers', () => {
    it('strips the asterisks and surrounding whitespace', () => {
      // Arrange
      const examples = [
        ['PP***', 'PP'],
        ['PP**', 'PP'],
        ['PL*', 'PL'],
        ['MDB*', 'MDB'],
        ['PCB **', 'PCB'],
        [' PRONA ', 'PRONA'],
      ] as const;

      // Act
      const normalized = examples.map(([raw]) => normalizeSiglaPartido(raw));

      // Assert
      expect(normalized).toEqual(examples.map(([, expected]) => expected));
    });
  });

  describe('when the sigla has no markers', () => {
    it('returns it unchanged', () => {
      // Act
      const sigla = normalizeSiglaPartido('MDB');

      // Assert
      expect(sigla).toBe('MDB');
    });
  });

  describe('when there is no usable sigla', () => {
    it('returns null for null, undefined, empty, and marker-only values', () => {
      // Act
      const results = [
        normalizeSiglaPartido(null),
        normalizeSiglaPartido(undefined),
        normalizeSiglaPartido(''),
        normalizeSiglaPartido('   '),
        normalizeSiglaPartido('***'),
      ];

      // Assert
      expect(results).toEqual([null, null, null, null, null]);
    });
  });
});
