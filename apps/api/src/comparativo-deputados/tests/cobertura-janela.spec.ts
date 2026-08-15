import { deriveCoberturaJanela } from '../rules/cobertura-janela';

describe('cobertura da janela do comparativo', () => {
  describe('janela encerrada, totalmente coberta pelos dois sinais', () => {
    it('cobre até o fim do último ano e o divisor iguala os anos civis tocados', () => {
      // Arrange
      const input = {
        dataInicioJanela: '2015-02-01T00:00:00Z',
        dataFimJanela: '2019-01-31T00:00:00Z',
        coberturaCotaMensal: [
          { year: 2015, coveredThroughMonth: 12 },
          { year: 2016, coveredThroughMonth: 12 },
          { year: 2017, coveredThroughMonth: 12 },
          { year: 2018, coveredThroughMonth: 12 },
          { year: 2019, coveredThroughMonth: 12 },
        ],
        coveredThroughDateAssinaturas: '2026-01-01',
      };

      // Act
      const cobertura = deriveCoberturaJanela(input);

      // Assert
      expect(cobertura).toEqual({
        coberturaAte: '2019-12-31',
        divisorAnosEfetivos: 5,
      });
    });
  });

  describe('janela em curso, ano corrente parcialmente coberto pela cota', () => {
    it('a cota é o gargalo e o divisor fica fracionário no ano corrente', () => {
      // Arrange
      const input = {
        dataInicioJanela: '2023-02-01T00:00:00Z',
        dataFimJanela: '2027-01-31T00:00:00Z',
        coberturaCotaMensal: [
          { year: 2023, coveredThroughMonth: 12 },
          { year: 2024, coveredThroughMonth: 12 },
          { year: 2025, coveredThroughMonth: 12 },
          { year: 2026, coveredThroughMonth: 6 },
        ],
        coveredThroughDateAssinaturas: '2026-08-10',
      };

      // Act
      const cobertura = deriveCoberturaJanela(input);

      // Assert
      expect(cobertura.coberturaAte).toEqual('2026-06-30');
      expect(cobertura.divisorAnosEfetivos).toBeCloseTo(3 + 181 / 365, 3);
    });
  });

  describe('divergência entre os dois sinais de cobertura', () => {
    it('quando as assinaturas cobrem menos que a cota, as assinaturas são o gargalo', () => {
      // Arrange
      const input = {
        dataInicioJanela: '2023-02-01T00:00:00Z',
        dataFimJanela: '2027-01-31T00:00:00Z',
        coberturaCotaMensal: [
          { year: 2023, coveredThroughMonth: 12 },
          { year: 2024, coveredThroughMonth: 12 },
          { year: 2025, coveredThroughMonth: 12 },
          { year: 2026, coveredThroughMonth: 8 },
        ],
        coveredThroughDateAssinaturas: '2026-03-15',
      };

      // Act
      const cobertura = deriveCoberturaJanela(input);

      // Assert
      expect(cobertura.coberturaAte).toEqual('2026-03-15');
      expect(cobertura.divisorAnosEfetivos).toBeCloseTo(3 + 74 / 365, 3);
    });

    it('quando a cota cobre menos que as assinaturas, a cota é o gargalo', () => {
      // Arrange
      const input = {
        dataInicioJanela: '2023-02-01T00:00:00Z',
        dataFimJanela: '2027-01-31T00:00:00Z',
        coberturaCotaMensal: [
          { year: 2023, coveredThroughMonth: 12 },
          { year: 2024, coveredThroughMonth: 12 },
          { year: 2025, coveredThroughMonth: 12 },
          { year: 2026, coveredThroughMonth: 4 },
        ],
        coveredThroughDateAssinaturas: '2026-09-01',
      };

      // Act
      const cobertura = deriveCoberturaJanela(input);

      // Assert
      expect(cobertura.coberturaAte).toEqual('2026-04-30');
      expect(cobertura.divisorAnosEfetivos).toBeCloseTo(3 + 120 / 365, 3);
    });
  });

  describe('ano final da janela sem nenhuma entrada de cobertura da cota', () => {
    it('a cobertura para no último ano plenamente coberto e o ano com buraco não conta', () => {
      // Arrange
      const input = {
        dataInicioJanela: '2023-02-01T00:00:00Z',
        dataFimJanela: '2027-01-31T00:00:00Z',
        coberturaCotaMensal: [
          { year: 2023, coveredThroughMonth: 12 },
          { year: 2024, coveredThroughMonth: 12 },
          { year: 2025, coveredThroughMonth: 12 },
        ],
        coveredThroughDateAssinaturas: '2026-09-01',
      };

      // Act
      const cobertura = deriveCoberturaJanela(input);

      // Assert
      expect(cobertura).toEqual({
        coberturaAte: '2025-12-31',
        divisorAnosEfetivos: 3,
      });
    });
  });

  describe('sem sinal de cobertura das assinaturas', () => {
    it('a cota sozinha determina a cobertura', () => {
      // Arrange
      const input = {
        dataInicioJanela: '2023-02-01T00:00:00Z',
        dataFimJanela: '2027-01-31T00:00:00Z',
        coberturaCotaMensal: [
          { year: 2023, coveredThroughMonth: 12 },
          { year: 2024, coveredThroughMonth: 12 },
          { year: 2025, coveredThroughMonth: 12 },
          { year: 2026, coveredThroughMonth: 5 },
        ],
        coveredThroughDateAssinaturas: null,
      };

      // Act
      const cobertura = deriveCoberturaJanela(input);

      // Assert
      expect(cobertura.coberturaAte).toEqual('2026-05-31');
      expect(cobertura.divisorAnosEfetivos).toBeCloseTo(3 + 151 / 365, 3);
    });
  });

  describe('janela de um único ano civil, ainda em curso', () => {
    it('não há anos fechados e o divisor fica inteiramente fracionário', () => {
      // Arrange
      const input = {
        dataInicioJanela: '2026-02-01T00:00:00Z',
        dataFimJanela: '2030-01-31T00:00:00Z',
        coberturaCotaMensal: [{ year: 2026, coveredThroughMonth: 3 }],
        coveredThroughDateAssinaturas: '2026-04-01',
      };

      // Act
      const cobertura = deriveCoberturaJanela(input);

      // Assert
      expect(cobertura.coberturaAte).toEqual('2026-03-31');
      expect(cobertura.divisorAnosEfetivos).toBeCloseTo(90 / 365, 3);
    });
  });

  describe('ano bissexto no denominador da fração', () => {
    it('usa 366 dias para calcular a fração de um ano bissexto', () => {
      // Arrange
      const input = {
        dataInicioJanela: '2023-02-01T00:00:00Z',
        dataFimJanela: '2027-01-31T00:00:00Z',
        coberturaCotaMensal: [
          { year: 2023, coveredThroughMonth: 12 },
          { year: 2024, coveredThroughMonth: 6 },
        ],
        coveredThroughDateAssinaturas: '2024-12-01',
      };

      // Act
      const cobertura = deriveCoberturaJanela(input);

      // Assert
      expect(cobertura.coberturaAte).toEqual('2024-06-30');
      expect(cobertura.divisorAnosEfetivos).toBeCloseTo(1 + 182 / 366, 3);
    });
  });
});
