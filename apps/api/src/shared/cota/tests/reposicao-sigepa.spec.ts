import {
  applyReposicaoSigepa,
  deriveSigepaDataStatus,
} from '../reposicao-sigepa';

describe('reposicao de passagem aerea SIGEPA na leitura', () => {
  describe('when the year is not reposto', () => {
    it('reads the dump as it is, negative estornos included', () => {
      // Arrange
      const gastosJson = {
        '8': { '1': 10000, '998': -2500 },
      };

      // Act
      const merged = applyReposicaoSigepa({
        year: 2025,
        anoReposto: false,
        gastosJson,
        gastosSigepaJson: { '8': 700000 },
      });

      // Assert
      expect(merged).toEqual({ '8': { '1': 10000, '998': -2500 } });
    });
  });

  describe('when the year is reposto', () => {
    it('replaces the dump 998 inside the janela instead of summing it', () => {
      // Arrange
      const gastosJson = {
        '8': { '1': 10000, '998': -2500 },
        '9': { '1': 3000 },
      };

      // Act
      const merged = applyReposicaoSigepa({
        year: 2025,
        anoReposto: true,
        gastosJson,
        gastosSigepaJson: { '8': 700000, '9': 120000 },
      });

      // Assert
      expect(merged).toEqual({
        '8': { '1': 10000, '998': 700000 },
        '9': { '1': 3000, '998': 120000 },
      });
    });

    it('keeps the dump 998 of the months before the janela', () => {
      // Arrange
      const gastosJson = {
        '7': { '998': 55000 },
        '8': { '998': -2500 },
      };

      // Act
      const merged = applyReposicaoSigepa({
        year: 2025,
        anoReposto: true,
        gastosJson,
        gastosSigepaJson: { '7': 999999, '8': 700000 },
      });

      // Assert
      expect(merged).toEqual({
        '7': { '998': 55000 },
        '8': { '998': 700000 },
      });
    });

    it('drops the month left without any category after discarding the dump 998', () => {
      // Arrange
      const gastosJson = { '9': { '998': -2500 } };

      // Act
      const merged = applyReposicaoSigepa({
        year: 2025,
        anoReposto: true,
        gastosJson,
        gastosSigepaJson: {},
      });

      // Assert
      expect(merged).toEqual({});
    });

    it('preserves a reposto value that is zero or negative', () => {
      // Arrange
      const gastosJson = { '9': { '1': 100 } };

      // Act
      const merged = applyReposicaoSigepa({
        year: 2025,
        anoReposto: true,
        gastosJson,
        gastosSigepaJson: { '9': 0, '10': -4300 },
      });

      // Assert
      expect(merged).toEqual({
        '9': { '1': 100, '998': 0 },
        '10': { '998': -4300 },
      });
    });

    it('does not mutate the gastos it received', () => {
      // Arrange
      const gastosJson = { '8': { '1': 10000, '998': -2500 } };

      // Act
      applyReposicaoSigepa({
        year: 2025,
        anoReposto: true,
        gastosJson,
        gastosSigepaJson: { '8': 700000 },
      });

      // Assert
      expect(gastosJson).toEqual({ '8': { '1': 10000, '998': -2500 } });
    });
  });

  describe('when the deputado has no dump row but flew inside the janela', () => {
    it('reads the reposto value instead of nenhum gasto registrado', () => {
      // Arrange
      const gastosSigepaJson = { '9': 120000 };

      // Act
      const merged = applyReposicaoSigepa({
        year: 2025,
        anoReposto: true,
        gastosJson: null,
        gastosSigepaJson,
      });

      // Assert
      expect(merged).toEqual({ '9': { '998': 120000 } });
    });
  });

  describe('when the deputado has neither dump row nor reposto value', () => {
    it('stays without gastos', () => {
      // Act
      const merged = applyReposicaoSigepa({
        year: 2025,
        anoReposto: true,
        gastosJson: null,
        gastosSigepaJson: {},
      });

      // Assert
      expect(merged).toBeNull();
    });
  });

  describe('when the dump row exists with no gasto at all', () => {
    it('keeps the row apart from a deputado with no row', () => {
      // Act
      const merged = applyReposicaoSigepa({
        year: 2025,
        anoReposto: true,
        gastosJson: {},
        gastosSigepaJson: {},
      });

      // Assert
      expect(merged).toEqual({});
    });
  });

  describe('when the year is outside the janela', () => {
    it('is untouched by the rule', () => {
      // Arrange
      const gastosJson = { '8': { '998': 55000 } };

      // Act
      const merged = applyReposicaoSigepa({
        year: 2024,
        anoReposto: true,
        gastosJson,
        gastosSigepaJson: { '8': 700000 },
      });

      // Assert
      expect(merged).toEqual({ '8': { '998': 55000 } });
    });
  });
});

describe('status da fonte de SIGEPA do ano', () => {
  describe('when the year predates the SIGEPA category', () => {
    it('answers nao-aplicavel', () => {
      // Act
      const status = deriveSigepaDataStatus({
        year: 2018,
        coveredThroughMonth: 12,
        anoReposto: false,
      });

      // Assert
      expect(status).toBe('nao-aplicavel');
    });
  });

  describe('when the loaded months are all outside the janela', () => {
    it('answers completo', () => {
      // Act
      const status = deriveSigepaDataStatus({
        year: 2025,
        coveredThroughMonth: 7,
        anoReposto: false,
      });

      // Assert
      expect(status).toBe('completo');
    });
  });

  describe('when the year reaches into the janela without being reposto', () => {
    it('answers incompleto', () => {
      // Act
      const status = deriveSigepaDataStatus({
        year: 2025,
        coveredThroughMonth: 8,
        anoReposto: false,
      });

      // Assert
      expect(status).toBe('incompleto');
    });

    it('answers incompleto for a year fully inside the janela', () => {
      // Act
      const status = deriveSigepaDataStatus({
        year: 2026,
        coveredThroughMonth: 3,
        anoReposto: false,
      });

      // Assert
      expect(status).toBe('incompleto');
    });
  });

  describe('when the year inside the janela is reposto', () => {
    it('answers completo, without a value of its own in the enum', () => {
      // Act
      const status = deriveSigepaDataStatus({
        year: 2026,
        coveredThroughMonth: 3,
        anoReposto: true,
      });

      // Assert
      expect(status).toBe('completo');
    });
  });
});
