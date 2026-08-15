import type { DeputadoProposicoesAssinadasJanelaSource } from '@/deputados/types/deputados.types';

import { toComparativoProposicoesAssinadas } from '../mappers/comparativo-proposicoes-assinadas.mapper';

describe('mapper de proposições assinadas do comparativo', () => {
  describe('quando todos os anos da janela estão cobertos', () => {
    it('soma os anos e expõe a fronteira da fonte', () => {
      // Arrange
      const source: DeputadoProposicoesAssinadasJanelaSource = {
        anos: [
          {
            year: 2023,
            coberto: true,
            assinaturasJson: {
              '2023-03-04': [4, 1] as const,
              '2023-05-10': [2, 0] as const,
            },
          },
          {
            year: 2024,
            coberto: true,
            assinaturasJson: { '2024-02-01': [10, 3] as const },
          },
        ],
        coveredThroughDate: '2025-08-14',
      };

      // Act
      const result = toComparativoProposicoesAssinadas(source);

      // Assert
      expect(result).toEqual({
        disponivel: true,
        total: 16,
        totalPrimeiroSignatario: 4,
        coveredThroughDate: '2025-08-14',
      });
    });

    it('conta zero para o ano coberto em que o deputado não assinou nada', () => {
      // Arrange
      const source: DeputadoProposicoesAssinadasJanelaSource = {
        anos: [
          {
            year: 2023,
            coberto: true,
            assinaturasJson: { '2023-03-04': [4, 1] as const },
          },
          { year: 2024, coberto: true, assinaturasJson: null },
        ],
        coveredThroughDate: '2025-08-14',
      };

      // Act
      const result = toComparativoProposicoesAssinadas(source);

      // Assert
      expect(result).toMatchObject({ disponivel: true, total: 4 });
    });
  });

  describe('quando um ano da janela está descoberto', () => {
    it('torna a métrica indisponível e nomeia os anos que faltam', () => {
      // Arrange
      const source: DeputadoProposicoesAssinadasJanelaSource = {
        anos: [
          {
            year: 2023,
            coberto: true,
            assinaturasJson: { '2023-03-04': [4, 1] as const },
          },
          { year: 2024, coberto: false, assinaturasJson: null },
        ],
        coveredThroughDate: '2023-12-20',
      };

      // Act
      const result = toComparativoProposicoesAssinadas(source);

      // Assert
      expect(result).toEqual({
        disponivel: false,
        motivo: 'anos-descobertos',
        anosDescobertos: [2024],
      });
    });
  });

  describe('quando a janela inteira está descoberta', () => {
    it('lista todos os anos como descobertos', () => {
      // Arrange
      const source: DeputadoProposicoesAssinadasJanelaSource = {
        anos: [
          { year: 2023, coberto: false, assinaturasJson: null },
          { year: 2024, coberto: false, assinaturasJson: null },
        ],
        coveredThroughDate: null,
      };

      // Act
      const result = toComparativoProposicoesAssinadas(source);

      // Assert
      expect(result).toEqual({
        disponivel: false,
        motivo: 'anos-descobertos',
        anosDescobertos: [2023, 2024],
      });
    });
  });
});
