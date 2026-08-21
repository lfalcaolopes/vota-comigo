import { selectLegislaturaAtual } from '../rules/legislatura-atual';

const LEGISLATURAS = [
  { legislatura: 56, dataInicio: '2019-02-01', dataFim: '2023-01-31' },
  { legislatura: 57, dataInicio: '2023-02-01', dataFim: '2027-01-31' },
  { legislatura: 58, dataInicio: '2027-02-01', dataFim: '2031-01-31' },
];

describe('legislatura de referência do agregado da cota', () => {
  describe('quando a data de referência cai dentro de uma legislatura', () => {
    it('escolhe a legislatura em curso', () => {
      // Arrange
      const referencia = '2026-08-20';

      // Act
      const result = selectLegislaturaAtual(LEGISLATURAS, referencia);

      // Assert
      expect(result).toMatchObject({ legislatura: 57 });
    });

    it('escolhe a que começa no dia da referência', () => {
      // Arrange
      const referencia = '2027-02-01';

      // Act
      const result = selectLegislaturaAtual(LEGISLATURAS, referencia);

      // Assert
      expect(result).toMatchObject({ legislatura: 58 });
    });
  });

  describe('quando a data de referência cai fora de qualquer legislatura', () => {
    it('escolhe a última já iniciada', () => {
      // Arrange
      const referencia = '2031-06-01';

      // Act
      const result = selectLegislaturaAtual(LEGISLATURAS, referencia);

      // Assert
      expect(result).toMatchObject({ legislatura: 58 });
    });

    it('não devolve legislatura quando nenhuma começou', () => {
      // Arrange
      const referencia = '2018-01-01';

      // Act
      const result = selectLegislaturaAtual(LEGISLATURAS, referencia);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('quando não há legislatura carregada', () => {
    it('não devolve legislatura', () => {
      // Arrange
      const legislaturas: never[] = [];

      // Act
      const result = selectLegislaturaAtual(legislaturas, '2026-08-20');

      // Assert
      expect(result).toBeNull();
    });
  });
});
