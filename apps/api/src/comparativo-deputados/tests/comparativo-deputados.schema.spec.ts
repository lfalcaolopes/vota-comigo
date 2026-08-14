import { comparativoDeputadosResponseSchema } from '@vota-comigo/shared-types';

function deputado(externalIdDeputado: number, year: number | null) {
  return {
    externalIdDeputado,
    nomePublico: 'Maria da Silva',
    nomeCivil: 'Maria da Silva',
    fonteOficial: 'https://www.camara.leg.br/deputados/220593',
    emAtividade: true,
    snapshotPublicoDisponivel: true,
    snapshotPublico: {
      nomeEleitoral: 'Maria da Silva',
      siglaPartido: 'PT',
      siglaUf: 'MG',
      urlFoto: null,
    },
    legislaturaInicialPeriodo: {
      dataInicio: '2019-02-01',
      dataFim: '2023-01-31',
    },
    legislaturaFinalPeriodo: {
      dataInicio: '2023-02-01',
      dataFim: '2027-01-31',
    },
    resumoPresencaDisponivel: true,
    resumoPresenca: {
      percentualPresenca: 90,
      presencas: 90,
      totalVotacoesEmExercicio: 100,
      ausenciasSemMotivoConhecido: 10,
    },
    proposicoesAssinadas:
      year === null
        ? null
        : {
            year,
            disponivel: true,
            total: 12,
            totalPrimeiroSignatario: 3,
            coveredThroughDate: `${year}-08-14`,
          },
    orgaos: year === null ? null : { year, items: [], total: 0 },
    cota:
      year === null
        ? null
        : {
            status: 'comparavel',
            percentualSobreMedianaUf: 88.5,
            medianaUf: { siglaUf: 'MG', deputadoCount: 53 },
          },
  };
}

describe('contrato do comparativo de deputados', () => {
  describe('quando há um ano comparável', () => {
    it('aceita as métricas do ano ao lado da identidade e da presença', () => {
      // Arrange
      const response = {
        year: 2025,
        comparableYears: [2023, 2024, 2025],
        items: [deputado(220593, 2025), deputado(204554, 2025)],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });

    it('recusa uma métrica do ano em ano diferente do aplicado', () => {
      // Arrange
      const response = {
        year: 2025,
        comparableYears: [2025],
        items: [deputado(220593, 2025), deputado(204554, 2024)],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('recusa um ano aplicado fora dos anos comparáveis', () => {
      // Arrange
      const response = {
        year: 2022,
        comparableYears: [2024, 2025],
        items: [deputado(220593, 2022), deputado(204554, 2022)],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando não há ano comparável', () => {
    it('aceita identidade e presença sem nenhuma métrica do ano', () => {
      // Arrange
      const response = {
        year: null,
        comparableYears: [],
        items: [deputado(220593, null), deputado(204554, null)],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });

    it('recusa métrica do ano sem ano aplicado', () => {
      // Arrange
      const response = {
        year: null,
        comparableYears: [],
        items: [deputado(220593, 2025), deputado(204554, null)],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando uma lacuna é declarada', () => {
    it('recusa flag de snapshot que não coincide com o dado', () => {
      // Arrange
      const item = deputado(220593, 2025);
      const response = {
        year: 2025,
        comparableYears: [2025],
        items: [
          { ...item, snapshotPublicoDisponivel: false },
          deputado(204554, 2025),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('recusa flag de presença que não coincide com o dado', () => {
      // Arrange
      const item = deputado(220593, 2025);
      const response = {
        year: 2025,
        comparableYears: [2025],
        items: [
          { ...item, resumoPresencaDisponivel: true, resumoPresenca: null },
          deputado(204554, 2025),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('aceita a cota sem comparação com o motivo declarado', () => {
      // Arrange
      const item = deputado(220593, 2025);
      const response = {
        year: 2025,
        comparableYears: [2025],
        items: [
          {
            ...item,
            cota: { status: 'sem-comparacao', motivo: 'exercicio-parcial' },
          },
          deputado(204554, 2025),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });

    it('recusa a cota comparável sem a mediana da UF', () => {
      // Arrange
      const item = deputado(220593, 2025);
      const response = {
        year: 2025,
        comparableYears: [2025],
        items: [
          {
            ...item,
            cota: { status: 'comparavel', percentualSobreMedianaUf: 88.5 },
          },
          deputado(204554, 2025),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando a lista de deputados é inválida', () => {
    it('recusa menos de dois deputados', () => {
      // Arrange
      const response = {
        year: 2025,
        comparableYears: [2025],
        items: [deputado(220593, 2025)],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('recusa mais de três deputados', () => {
      // Arrange
      const response = {
        year: 2025,
        comparableYears: [2025],
        items: [
          deputado(220593, 2025),
          deputado(204554, 2025),
          deputado(178957, 2025),
          deputado(74848, 2025),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('recusa o mesmo deputado repetido', () => {
      // Arrange
      const response = {
        year: 2025,
        comparableYears: [2025],
        items: [deputado(220593, 2025), deputado(220593, 2025)],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
