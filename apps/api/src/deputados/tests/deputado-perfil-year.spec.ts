import { deriveDeputadoPerfilYear } from '../rules/deputado-perfil-year';

describe('deriveDeputadoPerfilYear', () => {
  describe('when the final legislatura is still in progress', () => {
    it('uses the current year as the default', () => {
      // Arrange
      const currentYear = 2026;

      // Act
      const model = deriveDeputadoPerfilYear(
        {
          legislaturaInicialPeriodo: {
            dataInicio: '2023-02-01',
            dataFim: '2027-01-31',
          },
          legislaturaFinalPeriodo: {
            dataInicio: '2023-02-01',
            dataFim: '2027-01-31',
          },
        },
        currentYear,
      );

      // Assert
      expect(model.defaultYear).toBe(2026);
    });
  });

  describe('when the final legislatura has ended', () => {
    it('uses its final year as the default', () => {
      // Arrange
      const currentYear = 2026;

      // Act
      const model = deriveDeputadoPerfilYear(
        {
          legislaturaInicialPeriodo: {
            dataInicio: '2019-02-01',
            dataFim: '2023-01-31',
          },
          legislaturaFinalPeriodo: {
            dataInicio: '2019-02-01',
            dataFim: '2023-01-31',
          },
        },
        currentYear,
      );

      // Assert
      expect(model.defaultYear).toBe(2023);
    });
  });

  describe('when the deputado spans multiple legislaturas', () => {
    it('derives the valid range from the first start through the default year', () => {
      // Arrange
      const currentYear = 2026;

      // Act
      const model = deriveDeputadoPerfilYear(
        {
          legislaturaInicialPeriodo: {
            dataInicio: '2011-02-01',
            dataFim: '2015-01-31',
          },
          legislaturaFinalPeriodo: {
            dataInicio: '2023-02-01',
            dataFim: '2027-01-31',
          },
        },
        currentYear,
      );

      // Assert
      expect(model.validYearRange).toEqual({
        startYear: 2011,
        endYear: 2026,
      });
    });
  });

  describe('when validating a year', () => {
    it('accepts the range boundaries and rejects years outside them', () => {
      // Arrange
      const model = deriveDeputadoPerfilYear(
        {
          legislaturaInicialPeriodo: {
            dataInicio: '2019-02-01',
            dataFim: '2023-01-31',
          },
          legislaturaFinalPeriodo: {
            dataInicio: '2023-02-01',
            dataFim: '2027-01-31',
          },
        },
        2026,
      );

      // Act / Assert
      expect(model.isValidYear(2019)).toBe(true);
      expect(model.isValidYear(2026)).toBe(true);
      expect(model.isValidYear(2018)).toBe(false);
      expect(model.isValidYear(2027)).toBe(false);
    });
  });

  describe('when the deputado has no legislatura periods', () => {
    it('returns an unavailable model that rejects every year', () => {
      // Arrange / Act
      const model = deriveDeputadoPerfilYear(
        {
          legislaturaInicialPeriodo: null,
          legislaturaFinalPeriodo: null,
        },
        2026,
      );

      // Assert
      expect(model.defaultYear).toBeNull();
      expect(model.validYearRange).toBeNull();
      expect(model.isValidYear(2026)).toBe(false);
    });
  });

  describe('when only one legislatura period is available', () => {
    it('treats the year model as unavailable', () => {
      // Arrange / Act
      const model = deriveDeputadoPerfilYear(
        {
          legislaturaInicialPeriodo: null,
          legislaturaFinalPeriodo: {
            dataInicio: '2023-02-01',
            dataFim: '2027-01-31',
          },
        },
        2026,
      );

      // Assert
      expect(model.defaultYear).toBeNull();
      expect(model.validYearRange).toBeNull();
      expect(model.isValidYear(2026)).toBe(false);
    });
  });
});
