import { extractExternalIdFromUri } from './camara-uri';

describe('extractExternalIdFromUri', () => {
  describe('when the uri ends with a numeric identifier', () => {
    it('extracts the id from a deputado uri', () => {
      // Arrange
      const uri = 'https://dadosabertos.camara.leg.br/api/v2/deputados/220593';

      // Act
      const id = extractExternalIdFromUri(uri);

      // Assert
      expect(id).toBe(220593);
    });

    it('extracts the id from a partido uri', () => {
      // Arrange
      const uri = 'https://dadosabertos.camara.leg.br/api/v2/partidos/36899';

      // Act
      const id = extractExternalIdFromUri(uri);

      // Assert
      expect(id).toBe(36899);
    });

    it('ignores a trailing slash', () => {
      // Arrange
      const uri = 'https://dadosabertos.camara.leg.br/api/v2/partidos/36899/';

      // Act
      const id = extractExternalIdFromUri(uri);

      // Assert
      expect(id).toBe(36899);
    });
  });

  describe('when the uri cannot yield a numeric id', () => {
    it('returns null for an undefined uri', () => {
      // Act / Assert
      expect(extractExternalIdFromUri(undefined)).toBeNull();
    });

    it('returns null for an empty uri', () => {
      // Act / Assert
      expect(extractExternalIdFromUri('')).toBeNull();
    });

    it('returns null when the last segment is not numeric', () => {
      // Arrange
      const uri = 'https://dadosabertos.camara.leg.br/api/v2/partidos/abc';

      // Act / Assert
      expect(extractExternalIdFromUri(uri)).toBeNull();
    });
  });
});
