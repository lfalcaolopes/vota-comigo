import { deriveValorUtilizadoCentavos } from './valor-utilizado';

describe('valor utilizado da cota', () => {
  describe('when the record has a restituicao', () => {
    it('subtracts it from the valor liquido in cents', () => {
      // Arrange
      const record = { vlrLiquido: '1148.70', vlrRestituicao: '148.70' };

      // Act
      const result = deriveValorUtilizadoCentavos(record);

      // Assert
      expect(result).toEqual({ ok: true, centavos: 100000 });
    });
  });

  describe('when the restituicao field is empty', () => {
    it('uses the valor liquido untouched', () => {
      // Arrange
      const record = { vlrLiquido: '1148.7', vlrRestituicao: '' };

      // Act
      const result = deriveValorUtilizadoCentavos(record);

      // Assert
      expect(result).toEqual({ ok: true, centavos: 114870 });
    });
  });

  describe('when the record cancels or compensates a previous expense', () => {
    it('preserves the negative valor liquido', () => {
      // Arrange
      const record = { vlrLiquido: '-1148.70', vlrRestituicao: '' };

      // Act
      const result = deriveValorUtilizadoCentavos(record);

      // Assert
      expect(result).toEqual({ ok: true, centavos: -114870 });
    });

    it('turns the valor utilizado negative when the restituicao exceeds it', () => {
      // Arrange
      const record = { vlrLiquido: '100.00', vlrRestituicao: '150.05' };

      // Act
      const result = deriveValorUtilizadoCentavos(record);

      // Assert
      expect(result).toEqual({ ok: true, centavos: -5005 });
    });
  });

  describe('when the source value has an unexpected format', () => {
    it.each([
      ['1,50', 'vlrLiquido'],
      ['abc', 'vlrLiquido'],
      ['1.234', 'vlrLiquido'],
      ['', 'vlrLiquido'],
      ['1e3', 'vlrLiquido'],
    ])('rejects %s', (vlrLiquido, field) => {
      // Arrange
      const record = { vlrLiquido, vlrRestituicao: '' };

      // Act
      const result = deriveValorUtilizadoCentavos(record);

      // Assert
      expect(result).toEqual({ ok: false, field, value: vlrLiquido });
    });

    it('rejects an unparseable restituicao without falling back to zero', () => {
      // Arrange
      const record = { vlrLiquido: '10.00', vlrRestituicao: 'x' };

      // Act
      const result = deriveValorUtilizadoCentavos(record);

      // Assert
      expect(result).toEqual({
        ok: false,
        field: 'vlrRestituicao',
        value: 'x',
      });
    });
  });
});
