import { comparativoDeputadosResponseSchema } from '@vota-comigo/shared-types';

const JANELA_57_DISPONIVEL = {
  status: 'disponivel' as const,
  legislatura: 57,
  dataInicio: '2023-02-01',
  dataFim: '2024-06-15T00:00:00.000Z',
  encerrada: true,
  diasEmExercicioDisponivel: true,
  diasEmExercicio: 500,
  coberturaAte: '2024-06-15',
  divisorAnosEfetivos: 1.5,
};

const JANELA_56_DISPONIVEL = {
  ...JANELA_57_DISPONIVEL,
  legislatura: 56,
  dataInicio: '2019-02-01',
};

const JANELA_INDISPONIVEL = {
  status: 'indisponivel' as const,
  motivo: 'legislatura-anterior-a-cobertura' as const,
  ultimaLegislatura: 54,
};

function deputado(
  externalIdDeputado: number,
  janela: typeof JANELA_57_DISPONIVEL | typeof JANELA_INDISPONIVEL,
) {
  const disponivel = janela.status === 'disponivel';

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
    janela,
    resumoPresencaDisponivel: true,
    resumoPresenca: {
      percentualPresenca: 90,
      presencas: 90,
      totalVotacoesEmExercicio: 100,
      ausenciasSemMotivoConhecido: 10,
    },
    proposicoesAssinadas: !disponivel
      ? null
      : {
          disponivel: true,
          total: 12,
          totalPrimeiroSignatario: 3,
          coveredThroughDate: '2024-08-14',
        },
    orgaos: !disponivel ? null : { items: [], total: 0 },
    cota: !disponivel
      ? null
      : {
          status: 'comparavel',
          percentualSobreMedianaUf: 88.5,
          medianaUf: { siglaUf: 'MG', deputadoCount: 53 },
        },
  };
}

describe('contrato do comparativo de deputados', () => {
  describe('quando a janela está disponível', () => {
    it('aceita as métricas da janela ao lado da identidade e da presença', () => {
      // Arrange
      const response = {
        janelasCoincidem: true,
        items: [
          deputado(220593, JANELA_57_DISPONIVEL),
          deputado(204554, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });

    it('recusa uma métrica da janela ausente enquanto as demais estão presentes', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          { ...item, orgaos: null },
          deputado(204554, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('recusa coveredThroughDate anterior ao início da janela', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          {
            ...item,
            proposicoesAssinadas: {
              ...item.proposicoesAssinadas,
              coveredThroughDate: '2020-01-01',
            },
          },
          deputado(204554, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('recusa um órgão fora do período da janela', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          {
            ...item,
            orgaos: {
              total: 1,
              items: [
                {
                  externalIdOrgao: 2001,
                  siglaOrgao: 'CCJC',
                  nome: 'Comissão de Constituição e Justiça e de Cidadania',
                  titulo: 'Titular',
                  dataInicio: '2010-01-01',
                  dataFim: '2010-12-31',
                },
              ],
            },
          },
          deputado(204554, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando a janela está indisponível', () => {
    it('aceita identidade e presença sem nenhuma métrica da janela', () => {
      // Arrange
      const response = {
        janelasCoincidem: true,
        items: [
          deputado(220593, JANELA_INDISPONIVEL),
          deputado(204554, JANELA_INDISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });

    it('recusa uma métrica presente quando a janela está indisponível', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          { ...item, janela: JANELA_INDISPONIVEL },
          deputado(204554, JANELA_INDISPONIVEL),
        ],
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
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          { ...item, snapshotPublicoDisponivel: false },
          deputado(204554, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('recusa flag de presença que não coincide com o dado', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          { ...item, resumoPresencaDisponivel: true, resumoPresenca: null },
          deputado(204554, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('aceita a cota sem comparação com o motivo declarado', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          {
            ...item,
            cota: { status: 'sem-comparacao', motivo: 'exercicio-parcial' },
          },
          deputado(204554, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });

    it('recusa a cota comparável sem a mediana da UF', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          {
            ...item,
            cota: { status: 'comparavel', percentualSobreMedianaUf: 88.5 },
          },
          deputado(204554, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando janelasCoincidem não reflete as legislaturas dos itens', () => {
    it('recusa janelasCoincidem verdadeiro com legislaturas diferentes', () => {
      // Arrange
      const response = {
        janelasCoincidem: true,
        items: [
          deputado(220593, JANELA_57_DISPONIVEL),
          deputado(204554, JANELA_56_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('recusa janelasCoincidem falso com a mesma legislatura', () => {
      // Arrange
      const response = {
        janelasCoincidem: false,
        items: [
          deputado(220593, JANELA_57_DISPONIVEL),
          deputado(204554, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('aceita janelasCoincidem verdadeiro quando só um item tem janela disponível', () => {
      // Arrange
      const response = {
        janelasCoincidem: true,
        items: [
          deputado(220593, JANELA_57_DISPONIVEL),
          deputado(204554, JANELA_INDISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('quando a lista de deputados é inválida', () => {
    it('recusa menos de dois deputados', () => {
      // Arrange
      const response = {
        janelasCoincidem: true,
        items: [deputado(220593, JANELA_57_DISPONIVEL)],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });

    it('recusa mais de três deputados', () => {
      // Arrange
      const response = {
        janelasCoincidem: true,
        items: [
          deputado(220593, JANELA_57_DISPONIVEL),
          deputado(204554, JANELA_57_DISPONIVEL),
          deputado(178957, JANELA_57_DISPONIVEL),
          deputado(74848, JANELA_57_DISPONIVEL),
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
        janelasCoincidem: true,
        items: [
          deputado(220593, JANELA_57_DISPONIVEL),
          deputado(220593, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
