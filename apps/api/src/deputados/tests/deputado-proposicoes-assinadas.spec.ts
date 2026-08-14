import { somarAssinaturasDoAno } from '../rules/deputado-proposicoes-assinadas';

describe('soma de proposições assinadas do ano', () => {
  describe('quando o ano tem assinaturas em vários dias', () => {
    it('soma os contadores diários de assinadas e de primeiro signatário', () => {
      // Arrange
      const assinaturasJson = {
        '2022-03-23': [2, 1] as const,
        '2022-05-04': [1, 0] as const,
        '2022-08-16': [3, 1] as const,
      };

      // Act
      const result = somarAssinaturasDoAno(assinaturasJson);

      // Assert
      expect(result).toEqual({ total: 6, totalPrimeiroSignatario: 2 });
    });
  });

  describe('quando o JSON está vazio', () => {
    it('publica zeros em vez de falhar', () => {
      // Arrange
      const assinaturasJson = {};

      // Act
      const result = somarAssinaturasDoAno(assinaturasJson);

      // Assert
      expect(result).toEqual({ total: 0, totalPrimeiroSignatario: 0 });
    });
  });

  describe('quando o contador de primeiro signatário é menor que o de assinadas', () => {
    it('nunca soma o de primeiro signatário acima do de assinadas', () => {
      // Arrange
      const assinaturasJson = { '2022-03-23': [5, 1] as const };

      // Act
      const result = somarAssinaturasDoAno(assinaturasJson);

      // Assert
      expect(result.totalPrimeiroSignatario).toBeLessThanOrEqual(result.total);
    });
  });

  describe('quando um bucket está malformado', () => {
    it('ignora o bucket em vez de lançar', () => {
      // Arrange
      const assinaturasJson = {
        '2022-03-23': [2, 1] as const,
        '2022-05-04': ['x', 'y'] as unknown as readonly [number, number],
        '2022-08-16': [1] as unknown as readonly [number, number],
      };

      // Act
      const result = somarAssinaturasDoAno(assinaturasJson);

      // Assert
      expect(result).toEqual({ total: 2, totalPrimeiroSignatario: 1 });
    });
  });
});
