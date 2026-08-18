import { deriveAnosPublicaveis } from './anos-publicaveis';

describe('deriveAnosPublicaveis', () => {
  describe('when disco is empty', () => {
    it('publishes nothing', () => {
      // Arrange
      const input = { anosEmDisco: [], yearsEmEscopo: [2025] };

      // Act
      const result = deriveAnosPublicaveis(input);

      // Assert
      expect(result.piso).toBeNull();
      expect(result.teto).toBeNull();
      expect(result.isPublicavel(2025)).toBe(false);
    });
  });

  describe('when a single year is in scope but neighbours exist on disk outside it', () => {
    it('does not publish that year', () => {
      // Arrange
      const input = {
        anosEmDisco: [2024, 2025, 2026],
        yearsEmEscopo: [2025],
      };

      // Act
      const result = deriveAnosPublicaveis(input);

      // Assert
      expect(result.isPublicavel(2025)).toBe(false);
    });
  });

  describe('when the full neighbourhood of a year is in scope', () => {
    it('publishes that year', () => {
      // Arrange
      const input = {
        anosEmDisco: [2024, 2025, 2026],
        yearsEmEscopo: [2024, 2025, 2026],
      };

      // Act
      const result = deriveAnosPublicaveis(input);

      // Assert
      expect(result.isPublicavel(2025)).toBe(true);
    });
  });

  describe('when a year sits at the piso or teto of disco', () => {
    it('publishes with only two files covering the scanned neighbourhood', () => {
      // Arrange
      const input = { anosEmDisco: [2015, 2016], yearsEmEscopo: [2015, 2016] };

      // Act
      const result = deriveAnosPublicaveis(input);

      // Assert
      expect(result.piso).toBe(2015);
      expect(result.teto).toBe(2016);
      expect(result.isPublicavel(2015)).toBe(true);
      expect(result.isPublicavel(2016)).toBe(true);
    });
  });

  describe('when a neighbour inside [piso, teto] is missing from scope', () => {
    it('does not publish', () => {
      // Arrange
      const input = {
        anosEmDisco: [2023, 2024, 2025, 2026],
        yearsEmEscopo: [2023, 2025, 2026],
      };

      // Act
      const result = deriveAnosPublicaveis(input);

      // Assert
      expect(result.isPublicavel(2025)).toBe(false);
    });
  });
});
