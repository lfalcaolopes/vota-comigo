import { deriveComparableYears } from '../rules/comparable-years';

describe('anos comparáveis entre deputados', () => {
  describe('quando as faixas se sobrepõem', () => {
    it('usa a interseção das faixas de cada deputado', () => {
      // Arrange
      const validYearRanges = [
        { startYear: 2019, endYear: 2026 },
        { startYear: 2023, endYear: 2025 },
      ];

      // Act
      const result = deriveComparableYears(validYearRanges);

      // Assert
      expect(result.comparableYears).toEqual([2023, 2024, 2025]);
    });

    it('aplica o ano mais recente da interseção por padrão', () => {
      // Arrange
      const validYearRanges = [
        { startYear: 2019, endYear: 2026 },
        { startYear: 2023, endYear: 2025 },
      ];

      // Act
      const result = deriveComparableYears(validYearRanges);

      // Assert
      expect(result.defaultYear).toBe(2025);
    });

    it('trata uma faixa de um único ano como interseção válida', () => {
      // Arrange
      const validYearRanges = [
        { startYear: 2023, endYear: 2023 },
        { startYear: 2019, endYear: 2026 },
      ];

      // Act
      const result = deriveComparableYears(validYearRanges);

      // Assert
      expect(result).toEqual({ comparableYears: [2023], defaultYear: 2023 });
    });
  });

  describe('quando as faixas não se sobrepõem', () => {
    it('devolve nenhum ano comparável', () => {
      // Arrange
      const validYearRanges = [
        { startYear: 2011, endYear: 2014 },
        { startYear: 2023, endYear: 2026 },
      ];

      // Act
      const result = deriveComparableYears(validYearRanges);

      // Assert
      expect(result).toEqual({ comparableYears: [], defaultYear: null });
    });
  });

  describe('quando um deputado não tem faixa própria', () => {
    it('devolve nenhum ano comparável', () => {
      // Arrange
      const validYearRanges = [{ startYear: 2023, endYear: 2026 }, null];

      // Act
      const result = deriveComparableYears(validYearRanges);

      // Assert
      expect(result).toEqual({ comparableYears: [], defaultYear: null });
    });
  });
});
