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
    diasEmExercicio: 365,
    diasNaJanela: 365,
    medianaUf: { amountUsedCents: 90, deputadoCount: 4 },
    tetoUf: { amountCents: 500, monthCount: 12 },
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
        diasEmExercicio: 365,
        diasNaJanela: 365,
        medianaUf: {
          amountUsedCents: 39120400,
          deputadoCount: 53,
        },
        tetoUf: { amountCents: 50252784, monthCount: 12 },
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
    it('aceita a mediana da UF ao lado do recorte do exercício', () => {
      // Arrange
      const response = {
        ...loadedResponse(),
        exercicioAnoCompleto: false,
        diasEmExercicio: 153,
        diasNaJanela: 365,
        tetoUf: { amountCents: 20938255, monthCount: 5 },
      };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });

    it('rejeita mais dias em exercício do que a janela do ano tem', () => {
      // Arrange
      const response = {
        ...loadedResponse(),
        exercicioAnoCompleto: false,
        diasEmExercicio: 366,
        diasNaJanela: 365,
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
        tetoUf: null,
      };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando os dados do SIGEPA estão incompletos', () => {
    it('aceita a ausência de mediana no exercício anual completo', () => {
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

    it('rejeita a mediana calculada sobre os dados incompletos', () => {
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

  describe('quando o teto do ano acompanha a resposta', () => {
    it('rejeita o teto sem a UF que o define', () => {
      // Arrange
      const response = { ...loadedResponse(), siglaUf: null };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('aceita a ausência de teto em ano sem tabela publicada', () => {
      // Arrange
      const response = { ...loadedResponse(), tetoUf: null };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });

    it('aceita o teto proporcional a um exercício parcial', () => {
      // Arrange
      const response = {
        ...loadedResponse(),
        tetoUf: { amountCents: 20938255, monthCount: 5 },
      };

      // Act
      const result = deputadoCeapResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
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
