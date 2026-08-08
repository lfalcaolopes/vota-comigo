import {
  ACENTOS_SQL,
  normalizeSearchText,
  toLikePattern,
} from '../rules/texto-normalizado';

describe('normalizeSearchText', () => {
  describe('when the term has accents and mixed casing', () => {
    it('strips diacritics and lowercases', () => {
      // Act
      const result = normalizeSearchText('AÉCIO Nêves');

      // Assert
      expect(result).toBe('aecio neves');
    });
  });

  describe('when the term has no accents', () => {
    it('keeps the term unchanged apart from casing', () => {
      // Act
      const result = normalizeSearchText('Maria');

      // Assert
      expect(result).toBe('maria');
    });
  });
});

describe('ACENTOS_SQL', () => {
  describe('when used as the translate() argument pair', () => {
    it('pairs every accented char with exactly one replacement', () => {
      // Assert
      // translate() descarta silenciosamente os excedentes quando os dois
      // conjuntos tem tamanhos diferentes, corrompendo a busca sem erro.
      expect([...ACENTOS_SQL.de]).toHaveLength([...ACENTOS_SQL.para].length);
    });

    it('replaces each char with what the JS normalization produces', () => {
      // Assert
      for (const [index, char] of [...ACENTOS_SQL.de].entries()) {
        expect(ACENTOS_SQL.para[index]).toBe(normalizeSearchText(char));
      }
    });
  });
});

describe('toLikePattern', () => {
  describe('when the term contains LIKE wildcards', () => {
    it('escapes them so they match literally', () => {
      // Act
      const result = toLikePattern('100%_a');

      // Assert
      expect(result).toBe('%100\\%\\_a%');
    });
  });

  describe('when the term is plain text', () => {
    it('wraps it in wildcards', () => {
      // Act
      const result = toLikePattern('silva');

      // Assert
      expect(result).toBe('%silva%');
    });
  });
});
