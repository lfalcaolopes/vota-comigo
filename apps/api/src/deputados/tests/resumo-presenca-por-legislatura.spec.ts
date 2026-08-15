import type { EventoExercicio } from '@/exercicio/types/exercicio.types';

import { deriveResumoPresencaPorLegislatura } from '../rules/resumo-presenca-por-legislatura';
import type {
  LegislaturaJanelaPresenca,
} from '../rules/resumo-presenca-por-legislatura';
import type { VotacaoParaPresenca } from '../rules/resumo-presenca';

const EVENTO_EXERCICIO: EventoExercicio = {
  dataHora: '2019-02-01T00:00:00+00:00',
  situacao: 'Exercício',
  descricaoStatus: 'Entrada - Posse',
  partido: 'PT',
};

const LEGISLATURA_56: LegislaturaJanelaPresenca = {
  legislaturaId: 'leg-56',
  dataInicio: '2019-02-01',
  dataFim: '2023-01-31',
};

const LEGISLATURA_57: LegislaturaJanelaPresenca = {
  legislaturaId: 'leg-57',
  dataInicio: '2023-02-01',
  dataFim: '2027-01-31',
};

function votacao(
  overrides: Partial<VotacaoParaPresenca> = {},
): VotacaoParaPresenca {
  return {
    votacao: {
      dataHoraRegistro: '2020-06-01T10:00:00+00:00',
      data: '2020-06-01',
    },
    voto: 'sim',
    ...overrides,
  };
}

describe('deriveResumoPresencaPorLegislatura', () => {
  describe('when a deputado has exercise across two legislaturas', () => {
    it('returns independent counts for each legislatura', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [
          votacao({
            votacao: { dataHoraRegistro: '2020-06-01T10:00:00+00:00', data: '2020-06-01' },
            voto: 'sim',
          }),
          votacao({
            votacao: { dataHoraRegistro: '2020-07-01T10:00:00+00:00', data: '2020-07-01' },
            voto: null,
          }),
          votacao({
            votacao: { dataHoraRegistro: '2024-06-01T10:00:00+00:00', data: '2024-06-01' },
            voto: 'sim',
          }),
        ],
        legislaturas: [LEGISLATURA_56, LEGISLATURA_57],
      };

      // Act
      const result = deriveResumoPresencaPorLegislatura(input);

      // Assert
      expect(result).toHaveLength(2);
      const leg56 = result.find((r) => r.legislaturaId === 'leg-56');
      const leg57 = result.find((r) => r.legislaturaId === 'leg-57');
      expect(leg56?.resumoPresenca).toMatchObject({
        presencas: 1,
        ausenciasSemMotivoConhecido: 1,
      });
      expect(leg57?.resumoPresenca).toMatchObject({
        presencas: 1,
        ausenciasSemMotivoConhecido: 0,
      });
    });
  });

  describe('when a votacao falls outside every legislatura window', () => {
    it('is ignored by all partitions', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [
          votacao({
            votacao: {
              dataHoraRegistro: '2030-06-01T10:00:00+00:00',
              data: '2030-06-01',
            },
          }),
        ],
        legislaturas: [LEGISLATURA_56, LEGISLATURA_57],
      };

      // Act
      const result = deriveResumoPresencaPorLegislatura(input);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('when a legislatura window has no computable votacoes', () => {
    it('produces no line for that legislatura instead of a zero', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [
          votacao({
            votacao: {
              dataHoraRegistro: '2020-06-01T10:00:00+00:00',
              data: '2020-06-01',
            },
          }),
        ],
        legislaturas: [LEGISLATURA_56, LEGISLATURA_57],
      };

      // Act
      const result = deriveResumoPresencaPorLegislatura(input);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.legislaturaId).toBe('leg-56');
    });
  });

  describe('when a votacao lands exactly on the window boundary', () => {
    it('includes dataInicio and dataFim in the partition', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [
          votacao({
            votacao: {
              dataHoraRegistro: null,
              data: LEGISLATURA_56.dataInicio,
            },
          }),
          votacao({
            votacao: {
              dataHoraRegistro: null,
              data: LEGISLATURA_56.dataFim,
            },
          }),
        ],
        legislaturas: [LEGISLATURA_56],
      };

      // Act
      const result = deriveResumoPresencaPorLegislatura(input);

      // Assert
      expect(result[0]?.resumoPresenca).toMatchObject({
        presencas: 2,
      });
    });
  });

  describe('when a votacao has no usable date', () => {
    it('is excluded from every partition', () => {
      // Arrange
      const input = {
        eventos: [EVENTO_EXERCICIO],
        votacoes: [
          votacao({ votacao: { dataHoraRegistro: null, data: null } }),
          votacao({
            votacao: {
              dataHoraRegistro: '2020-06-01T10:00:00+00:00',
              data: '2020-06-01',
            },
          }),
        ],
        legislaturas: [LEGISLATURA_56],
      };

      // Act
      const result = deriveResumoPresencaPorLegislatura(input);

      // Assert
      expect(result[0]?.resumoPresenca).toMatchObject({ presencas: 1 });
    });
  });
});
