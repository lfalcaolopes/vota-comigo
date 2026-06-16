import { parseRedesSociais } from '../rules/redes-sociais';

describe('parseRedesSociais', () => {
  describe('when the input is null', () => {
    it('returns an empty array', () => {
      expect(parseRedesSociais(null)).toEqual([]);
    });
  });

  describe('when the input is empty or whitespace only', () => {
    it('returns an empty array for empty string', () => {
      expect(parseRedesSociais('')).toEqual([]);
    });

    it('returns an empty array for whitespace-only string', () => {
      expect(parseRedesSociais('   ')).toEqual([]);
    });
  });

  describe('when there is a single valid https URL', () => {
    it('returns that URL trimmed', () => {
      // Arrange
      const input = '  https://twitter.com/maria  ';

      // Act / Assert
      expect(parseRedesSociais(input)).toEqual(['https://twitter.com/maria']);
    });
  });

  describe('when there are multiple valid URLs separated by commas', () => {
    it('returns all trimmed URLs in order', () => {
      // Arrange
      const input =
        'https://twitter.com/maria , https://instagram.com/maria';

      // Act / Assert
      expect(parseRedesSociais(input)).toEqual([
        'https://twitter.com/maria',
        'https://instagram.com/maria',
      ]);
    });
  });

  describe('when there are empty segments between commas', () => {
    it('drops empty segments', () => {
      // Arrange
      const input = 'https://twitter.com/maria,,https://instagram.com/maria,';

      // Act / Assert
      expect(parseRedesSociais(input)).toEqual([
        'https://twitter.com/maria',
        'https://instagram.com/maria',
      ]);
    });
  });

  describe('when URLs with invalid or unsafe protocols are present', () => {
    it('keeps http and https URLs', () => {
      expect(parseRedesSociais('http://example.com')).toEqual([
        'http://example.com',
      ]);
    });

    it('discards ftp URLs', () => {
      expect(parseRedesSociais('ftp://example.com')).toEqual([]);
    });

    it('discards mailto URLs', () => {
      expect(parseRedesSociais('mailto:user@example.com')).toEqual([]);
    });

    it('discards javascript: URLs', () => {
      expect(parseRedesSociais('javascript:alert(1)')).toEqual([]);
    });

    it('discards strings without a scheme (www.x)', () => {
      expect(parseRedesSociais('www.example.com')).toEqual([]);
    });
  });

  describe('when there is a mix of valid and invalid URLs', () => {
    it('keeps only valid http/https URLs in original order', () => {
      // Arrange
      const input = [
        'https://twitter.com/maria',
        'ftp://files.example.com',
        'https://instagram.com/maria',
        'www.example.com',
        'javascript:alert(1)',
      ].join(',');

      // Act / Assert
      expect(parseRedesSociais(input)).toEqual([
        'https://twitter.com/maria',
        'https://instagram.com/maria',
      ]);
    });
  });

  describe('when there are exact duplicates', () => {
    it('deduplicates preserving first occurrence order', () => {
      // Arrange
      const input =
        'https://twitter.com/maria,https://instagram.com/maria,https://twitter.com/maria';

      // Act / Assert
      expect(parseRedesSociais(input)).toEqual([
        'https://twitter.com/maria',
        'https://instagram.com/maria',
      ]);
    });
  });

  describe('when valid URLs have trailing whitespace', () => {
    it('returns the original trimmed URL, not a normalized URL.href', () => {
      // Arrange
      const input = '  https://example.com/path  ';

      // Act
      const result = parseRedesSociais(input);

      // Assert
      expect(result).toEqual(['https://example.com/path']);
    });
  });
});
