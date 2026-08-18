import { deriveIntervaloNascimento } from '../rules/faixa-etaria';

describe('deriveIntervaloNascimento', () => {
  describe('when the faixa is open at the young end', () => {
    it('bounds only how recent the birth can be', () => {
      // Arrange
      const referencia = '2026-08-15';

      // Act
      const intervalo = deriveIntervaloNascimento('ate-39', referencia);

      // Assert
      expect(intervalo).toEqual({
        nascidoApos: '1986-08-15',
        nascidoAte: null,
      });
    });
  });

  describe('when the faixa is open at the old end', () => {
    it('bounds only how distant the birth can be', () => {
      // Arrange
      const referencia = '2026-08-15';

      // Act
      const intervalo = deriveIntervaloNascimento('70-mais', referencia);

      // Assert
      expect(intervalo).toEqual({
        nascidoApos: null,
        nascidoAte: '1956-08-15',
      });
    });
  });

  describe('when the faixa is a closed decade', () => {
    it('bounds both ends', () => {
      // Arrange
      const referencia = '2026-08-15';

      // Act
      const intervalo = deriveIntervaloNascimento('50-59', referencia);

      // Assert
      expect(intervalo).toEqual({
        nascidoApos: '1966-08-15',
        nascidoAte: '1976-08-15',
      });
    });
  });

  describe('when a deputado turns the lower age exactly on the reference date', () => {
    it('places the birthday inside the faixa that starts at that age', () => {
      // Arrange
      const referencia = '2026-08-15';
      const nascimento = '1986-08-15';

      // Act
      const faixaDosQuarenta = deriveIntervaloNascimento('40-49', referencia);
      const faixaAbaixo = deriveIntervaloNascimento('ate-39', referencia);

      // Assert
      expect(faixaDosQuarenta.nascidoAte).toBe(nascimento);
      expect(faixaAbaixo.nascidoApos).toBe(nascimento);
    });
  });

  describe('when the reference date is february 29', () => {
    it('keeps the boundary on a real calendar date', () => {
      // Arrange
      const referencia = '2024-02-29';

      // Act
      const intervalo = deriveIntervaloNascimento('40-49', referencia);

      // Assert
      expect(intervalo).toEqual({
        nascidoApos: '1974-03-01',
        nascidoAte: '1984-02-29',
      });
    });
  });
});
