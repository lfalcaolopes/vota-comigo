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

function cotaAno(year: number, overrides: Record<string, unknown> = {}) {
  return {
    year,
    naComparacao: true,
    percentualSobreMedianaUf: 88.5,
    diasEmExercicio: 365,
    diasNoAno: 365,
    medianaUfDeputadoCount: 53,
    dadoIncompleto: false,
    ...overrides,
  };
}

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
    resumoPresencaDisponivel: disponivel,
    resumoPresenca: !disponivel
      ? null
      : {
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
          siglaUf: 'MG',
          anos: [cotaAno(2023), cotaAno(2024)],
          anosNaComparacao: 2,
          diasEmExercicio: 730,
          diasNaComparacao: 730,
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
    it('aceita identidade sem nenhuma métrica da janela, incluindo presença', () => {
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

    it('aceita a cota sem comparação com o motivo e os anos declarados', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          {
            ...item,
            cota: {
              status: 'sem-comparacao',
              motivo: 'sem-mediana-na-janela',
              anos: [
                cotaAno(2023, {
                  naComparacao: false,
                  percentualSobreMedianaUf: null,
                  medianaUfDeputadoCount: null,
                }),
              ],
            },
          },
          deputado(204554, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });

    it('recusa a cota comparável sem a UF da mediana', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          {
            ...item,
            cota: {
              status: 'comparavel',
              percentualSobreMedianaUf: 88.5,
              anos: [cotaAno(2023)],
              anosNaComparacao: 1,
              diasEmExercicio: 365,
              diasNaComparacao: 365,
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

  describe('quando o detalhamento por ano da cota é publicado', () => {
    it('recusa um ano em comparação sem posição frente à mediana', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          {
            ...item,
            cota: {
              status: 'comparavel',
              percentualSobreMedianaUf: 88.5,
              siglaUf: 'MG',
              anos: [
                cotaAno(2023, { percentualSobreMedianaUf: null }),
                cotaAno(2024),
              ],
              anosNaComparacao: 2,
              diasEmExercicio: 730,
              diasNaComparacao: 730,
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

    it('recusa anosNaComparacao que não conta os anos marcados', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          {
            ...item,
            cota: {
              status: 'comparavel',
              percentualSobreMedianaUf: 88.5,
              siglaUf: 'MG',
              anos: [
                cotaAno(2023),
                cotaAno(2024, {
                  naComparacao: false,
                  percentualSobreMedianaUf: null,
                  medianaUfDeputadoCount: null,
                }),
              ],
              anosNaComparacao: 2,
              diasEmExercicio: 730,
              diasNaComparacao: 730,
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

    it('recusa a exposição em dias que não soma os anos em comparação', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          {
            ...item,
            cota: {
              status: 'comparavel',
              percentualSobreMedianaUf: 88.5,
              siglaUf: 'MG',
              anos: [cotaAno(2023), cotaAno(2024)],
              anosNaComparacao: 2,
              diasEmExercicio: 500,
              diasNaComparacao: 730,
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

  describe('quando as proposições assinadas não estão disponíveis', () => {
    it('aceita a indisponibilidade com o motivo e os anos descobertos', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          {
            ...item,
            proposicoesAssinadas: {
              disponivel: false,
              motivo: 'anos-descobertos',
              anosDescobertos: [2024],
            },
          },
          deputado(204554, JANELA_57_DISPONIVEL),
        ],
      };

      // Act
      const result = comparativoDeputadosResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
    });

    it('recusa a indisponibilidade sem nenhum ano descoberto', () => {
      // Arrange
      const item = deputado(220593, JANELA_57_DISPONIVEL);
      const response = {
        janelasCoincidem: true,
        items: [
          {
            ...item,
            proposicoesAssinadas: {
              disponivel: false,
              motivo: 'anos-descobertos',
              anosDescobertos: [],
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
