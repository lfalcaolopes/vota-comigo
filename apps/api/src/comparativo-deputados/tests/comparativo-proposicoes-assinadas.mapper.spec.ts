import { toComparativoProposicoesAssinadas } from '../mappers/comparativo-proposicoes-assinadas.mapper';

describe('mapper de proposições assinadas do comparativo', () => {
  describe('quando o ano não está coberto', () => {
    it('devolve indisponível sem somar assinaturas', () => {
      // Arrange
      const source = {
        anoCoberto: false,
        assinaturasJson: null,
        coveredThroughDate: null,
      };

      // Act
      const result = toComparativoProposicoesAssinadas(source);

      // Assert
      expect(result).toEqual({ disponivel: false });
    });
  });

  describe('quando o ano está coberto', () => {
    it('soma as assinaturas e expõe a fronteira, sem carregar o ano', () => {
      // Arrange
      const source = {
        anoCoberto: true,
        assinaturasJson: {
          '2024-03-04': [4, 1] as const,
          '2024-05-10': [2, 0] as const,
        },
        coveredThroughDate: '2025-08-14',
      };

      // Act
      const result = toComparativoProposicoesAssinadas(source);

      // Assert
      expect(result).toEqual({
        disponivel: true,
        total: 6,
        totalPrimeiroSignatario: 1,
        coveredThroughDate: '2025-08-14',
      });
    });
  });
});
