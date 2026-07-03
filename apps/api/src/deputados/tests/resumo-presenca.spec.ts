import type { EventoExercicio } from '@/exercicio/types/exercicio.types';

import { deriveResumoPresenca } from '../rules/resumo-presenca';
import type { VotacaoParaPresenca } from '../rules/resumo-presenca';

const EVENTO_EXERCICIO: EventoExercicio = {
  dataHora: '2023-01-01T00:00:00+00:00',
  situacao: 'Exercício',
  descricaoStatus: 'Entrada - Posse',
  partido: 'PT',
};

const EVENTO_SAIDA: EventoExercicio = {
  dataHora: '2023-12-31T00:00:00+00:00',
  situacao: 'Fim de Mandato',
  descricaoStatus: 'Saída - Fim de Mandato',
  partido: 'PT',
};

function votacao(
  overrides: Partial<VotacaoParaPresenca> = {},
): VotacaoParaPresenca {
  return {
    votacao: {
      dataHoraRegistro: '2023-06-01T10:00:00+00:00',
      data: '2023-06-01',
    },
    voto: null,
    ...overrides,
  };
}

describe('deriveResumoPresenca', () => {
  describe('when there are no votacoes', () => {
    it('returns resumoPresencaDisponivel false and resumoPresenca null', () => {
      // Arrange
      const input = { eventos: [EVENTO_EXERCICIO], votacoes: [] };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresencaDisponivel).toBe(false);
      expect(result.resumoPresenca).toBeNull();
    });
  });

  describe('when all votacoes are fora_de_exercicio', () => {
    it('returns resumoPresencaDisponivel false because the denominator is zero', () => {
      // Arrange
      const input = {
        eventos: [
          { ...EVENTO_EXERCICIO, dataHora: '2020-01-01T00:00:00+00:00' },
          { ...EVENTO_SAIDA, dataHora: '2020-12-31T00:00:00+00:00' },
        ],
        votacoes: [votacao({ voto: null })],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresencaDisponivel).toBe(false);
      expect(result.resumoPresenca).toBeNull();
    });
  });

  describe('when all votacoes are lacuna_de_dados (no events)', () => {
    it('returns resumoPresencaDisponivel false because the denominator is zero', () => {
      // Arrange
      const input = {
        eventos: [],
        votacoes: [votacao({ voto: null })],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresencaDisponivel).toBe(false);
      expect(result.resumoPresenca).toBeNull();
    });
  });

  describe('when the deputado voted sim', () => {
    it('counts as presenca', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [votacao({ voto: 'sim' as const })],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresencaDisponivel).toBe(true);
      expect(result.resumoPresenca?.presencas).toBe(1);
      expect(result.resumoPresenca?.ausenciasSemMotivoConhecido).toBe(0);
      expect(result.resumoPresenca?.totalVotacoesEmExercicio).toBe(1);
      expect(result.resumoPresenca?.percentualPresenca).toBe(100);
    });
  });

  describe('when the deputado voted nao', () => {
    it('counts as presenca', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [votacao({ voto: 'nao' as const })],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresenca?.presencas).toBe(1);
      expect(result.resumoPresenca?.totalVotacoesEmExercicio).toBe(1);
    });
  });

  describe('when the deputado voted abstencao', () => {
    it('counts as presenca', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [votacao({ voto: 'abstencao' as const })],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresenca?.presencas).toBe(1);
    });
  });

  describe('when the deputado voted obstrucao', () => {
    it('counts as presenca', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [votacao({ voto: 'obstrucao' as const })],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresenca?.presencas).toBe(1);
    });
  });

  describe('when the deputado voted artigo_17', () => {
    it('counts as presenca without a separate counter', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [votacao({ voto: 'artigo_17' as const })],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresenca?.presencas).toBe(1);
      expect(result.resumoPresenca?.ausenciasSemMotivoConhecido).toBe(0);
    });
  });

  describe('when the deputado has voto nao_informado', () => {
    it('counts as presenca without a separate counter', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [votacao({ voto: 'nao_informado' as const })],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresenca?.presencas).toBe(1);
      expect(result.resumoPresenca?.ausenciasSemMotivoConhecido).toBe(0);
    });
  });

  describe('when the deputado was absent without known reason', () => {
    it('increments ausenciasSemMotivoConhecido and is excluded from presencas', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [votacao({ voto: null })],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresencaDisponivel).toBe(true);
      expect(result.resumoPresenca?.presencas).toBe(0);
      expect(result.resumoPresenca?.ausenciasSemMotivoConhecido).toBe(1);
      expect(result.resumoPresenca?.totalVotacoesEmExercicio).toBe(1);
      expect(result.resumoPresenca?.percentualPresenca).toBe(0);
    });
  });

  describe('when there is a mix of presencas and ausencias', () => {
    it('computes percentualPresenca as presencas / totalVotacoesEmExercicio * 100', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [
          votacao({ voto: 'sim' as const }),
          votacao({ voto: 'sim' as const }),
          votacao({ voto: 'sim' as const }),
          votacao({ voto: null }),
        ],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresenca?.presencas).toBe(3);
      expect(result.resumoPresenca?.ausenciasSemMotivoConhecido).toBe(1);
      expect(result.resumoPresenca?.totalVotacoesEmExercicio).toBe(4);
      expect(result.resumoPresenca?.percentualPresenca).toBe(75);
    });
  });

  describe('breakdown counters for observability', () => {
    it('counts fora_de_exercicio and lacuna_de_dados alongside the resumo', () => {
      // Arrange
      const input = {
        eventos: [
          { ...EVENTO_EXERCICIO, dataHora: '2023-01-01T00:00:00+00:00' },
          { ...EVENTO_SAIDA, dataHora: '2023-12-31T00:00:00+00:00' },
        ],
        votacoes: [
          // in exercise: presenca
          votacao({
            voto: 'sim' as const,
            votacao: {
              dataHoraRegistro: '2023-06-01T10:00:00+00:00',
              data: '2023-06-01',
            },
          }),
          // fora de exercicio (before any interval)
          votacao({
            voto: null,
            votacao: {
              dataHoraRegistro: '2019-01-01T10:00:00+00:00',
              data: '2019-01-01',
            },
          }),
          // lacuna: no timestamp and no voto
          votacao({ voto: null, votacao: { dataHoraRegistro: null, data: null } }),
        ],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.foraDeExercicio).toBe(1);
      expect(result.lacunaDeDados).toBe(1);
      expect(result.resumoPresenca?.totalVotacoesEmExercicio).toBe(1);
    });

    it('reports breakdown counters even when the resumo is unavailable', () => {
      // Arrange
      const input = {
        eventos: [],
        votacoes: [votacao({ voto: null }), votacao({ voto: null })],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresencaDisponivel).toBe(false);
      expect(result.lacunaDeDados).toBe(2);
      expect(result.foraDeExercicio).toBe(0);
    });
  });

  describe('when votacoes include fora_de_exercicio alongside in-exercise votes', () => {
    it('excludes fora_de_exercicio from the denominator', () => {
      // Arrange
      const input = {
        eventos: [
          { ...EVENTO_EXERCICIO, dataHora: '2023-01-01T00:00:00+00:00' },
          { ...EVENTO_SAIDA, dataHora: '2023-12-31T00:00:00+00:00' },
        ],
        votacoes: [
          // in exercise, 2023-06-01
          votacao({
            voto: 'sim' as const,
            votacao: {
              dataHoraRegistro: '2023-06-01T10:00:00+00:00',
              data: '2023-06-01',
            },
          }),
          // fora de exercicio: before any exercise interval
          votacao({
            voto: null,
            votacao: {
              dataHoraRegistro: '2019-01-01T10:00:00+00:00',
              data: '2019-01-01',
            },
          }),
        ],
      };

      // Act
      const result = deriveResumoPresenca(input);

      // Assert
      expect(result.resumoPresencaDisponivel).toBe(true);
      expect(result.resumoPresenca?.totalVotacoesEmExercicio).toBe(1);
      expect(result.resumoPresenca?.presencas).toBe(1);
      expect(result.resumoPresenca?.ausenciasSemMotivoConhecido).toBe(0);
    });
  });
});
