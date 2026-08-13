import { deriveDeputadoCeapState } from '../rules/deputado-ceap-state';

describe('estado anual dos gastos da cota', () => {
  describe('quando o ano foi ingerido e o deputado tem gastos', () => {
    it('resolve para dados presentes', () => {
      // Arrange
      const input = {
        year: 2024,
        validYearRange: { startYear: 2022, endYear: 2025 },
        ingestedYears: [2023, 2024, 2025],
        hasGastos: true,
      };

      // Act
      const result = deriveDeputadoCeapState(input);

      // Assert
      expect(result).toEqual({
        status: 'ok',
        availableYears: [2023, 2024, 2025],
      });
    });
  });

  describe('quando o ano foi ingerido e o deputado não tem gastos', () => {
    it('resolve para ausência de gastos', () => {
      // Arrange
      const input = {
        year: 2024,
        validYearRange: { startYear: 2022, endYear: 2025 },
        ingestedYears: [2023, 2024, 2025],
        hasGastos: false,
      };

      // Act
      const result = deriveDeputadoCeapState(input);

      // Assert
      expect(result.status).toBe('sem-gastos');
    });
  });

  describe('quando o ano do deputado ainda não foi ingerido', () => {
    it('resolve para ano não carregado', () => {
      // Arrange
      const input = {
        year: 2022,
        validYearRange: { startYear: 2022, endYear: 2025 },
        ingestedYears: [2023, 2024, 2025],
        hasGastos: false,
      };

      // Act
      const result = deriveDeputadoCeapState(input);

      // Assert
      expect(result.status).toBe('ano-nao-carregado');
    });
  });

  describe('quando o ano está fora da faixa do deputado', () => {
    it('não resolve um estado anual', () => {
      // Arrange
      const input = {
        year: 2021,
        validYearRange: { startYear: 2022, endYear: 2025 },
        ingestedYears: [2021, 2022, 2023, 2024, 2025, 2026],
        hasGastos: true,
      };

      // Act
      const result = deriveDeputadoCeapState(input);

      // Assert
      expect(result.status).toBeNull();
    });
  });

  describe('quando há anos ingeridos fora da faixa do deputado', () => {
    it('oferece somente a interseção com a faixa', () => {
      // Arrange
      const input = {
        year: 2023,
        validYearRange: { startYear: 2022, endYear: 2024 },
        ingestedYears: [2020, 2021, 2023, 2025],
        hasGastos: true,
      };

      // Act
      const result = deriveDeputadoCeapState(input);

      // Assert
      expect(result.availableYears).toEqual([2023]);
    });
  });
});
