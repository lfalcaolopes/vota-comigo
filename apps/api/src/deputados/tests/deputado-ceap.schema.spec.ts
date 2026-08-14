import { deputadoCeapResponseSchema } from '@vota-comigo/shared-types';

function loadedResponse() {
  return {
    year: 2025,
    availableYears: [2025],
    status: 'ok',
    sigepaDataStatus: 'completo',
    coveredThroughMonth: 8,
    totalAmountUsedCents: 100,
    siglaUf: 'MG',
    exercicioAnoCompleto: true,
    periodosExercicio: [],
    medianaUf: { amountUsedCents: 90, deputadoCount: 4 },
    categories: [],
    months: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      totalAmountUsedCents: index < 8 ? 0 : null,
      categories: [],
    })),
  };
}

describe('contrato dos gastos da cota do deputado', () => {
  describe('quando o ano tem dados', () => {
    it('aceita os agregados oficiais com os doze meses em ordem', () => {
      // Arrange
      const response = {
        year: 2025,
        availableYears: [2023, 2024, 2025],
        status: 'ok',
        sigepaDataStatus: 'completo',
        coveredThroughMonth: 8,
        totalAmountUsedCents: 42797820,
        siglaUf: 'MG',
        exercicioAnoCompleto: true,
        periodosExercicio: [
          {
            startDate: '2025-01-01T00:00:00.000Z',
            endDate: '2026-01-01T00:00:00.000Z',
          },
        ],
        medianaUf: {
          amountUsedCents: 39120400,
          deputadoCount: 53,
        },
        categories: [
          {
            externalNumSubCota: 1,
            description:
              'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR',
            amountUsedCents: 42797820,
          },
        ],
        months: Array.from({ length: 12 }, (_, index) => ({
          month: index + 1,
          totalAmountUsedCents: index < 8 ? 1000 : null,
          categories:
            index < 8 ? [{ externalNumSubCota: 1, amountUsedCents: 1000 }] : [],
        })),
      };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('quando o ano não foi carregado', () => {
    it('aceita somente o estado e os anos disponíveis', () => {
      // Arrange
      const response = {
        year: 2022,
        availableYears: [2023, 2024, 2025],
        status: 'ano-nao-carregado',
      };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('quando o deputado exerceu apenas parte do ano', () => {
    it('rejeita uma comparação com a mediana da UF', () => {
      // Arrange
      const response = {
        year: 2025,
        availableYears: [2025],
        status: 'ok',
        sigepaDataStatus: 'completo',
        coveredThroughMonth: 8,
        totalAmountUsedCents: 100,
        siglaUf: 'MG',
        exercicioAnoCompleto: false,
        periodosExercicio: [
          {
            startDate: '2025-08-01T00:00:00.000Z',
            endDate: '2026-01-01T00:00:00.000Z',
          },
        ],
        medianaUf: { amountUsedCents: 39120400, deputadoCount: 53 },
        categories: [],
        months: Array.from({ length: 12 }, (_, index) => ({
          month: index + 1,
          totalAmountUsedCents: index < 8 ? 0 : null,
          categories: [],
        })),
      };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando um mês está além da cobertura', () => {
    it('rejeita zero porque ausência de dado não é ausência de gasto', () => {
      // Arrange
      const response = loadedResponse();
      response.months[8].totalAmountUsedCents = 0;

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando o estado informa ausência de gastos', () => {
    it('rejeita um total diferente de zero', () => {
      // Arrange
      const response = {
        ...loadedResponse(),
        status: 'sem-gastos',
        totalAmountUsedCents: 1,
        siglaUf: null,
        medianaUf: null,
      };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando os dados do SIGEPA estão incompletos', () => {
    it('aceita os gastos sem publicar uma mediana da UF', () => {
      // Arrange
      const response = {
        ...loadedResponse(),
        sigepaDataStatus: 'incompleto',
        medianaUf: null,
      };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });

    it('rejeita uma mediana calculada sobre os dados incompletos', () => {
      // Arrange
      const response = {
        ...loadedResponse(),
        sigepaDataStatus: 'incompleto',
      };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando um valor público tem fração de centavo', () => {
    it('rejeita o valor', () => {
      // Arrange
      const response = {
        ...loadedResponse(),
        totalAmountUsedCents: 100.5,
      };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando o deputado exerceu o ano inteiro com gastos', () => {
    it('exige a mediana da UF com a contagem da amostra', () => {
      // Arrange
      const response = { ...loadedResponse(), medianaUf: null };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
