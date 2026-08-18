import { classifyDeputadoVotacao } from '../rules/deputado-votacao';
import type { IntervaloExercicio } from '../types/exercicio.types';

// Formatos reais: os intervalos vêm de colunas timestamptz e votacao.data de
// uma coluna date, que o driver entrega sem hora.
const emExercicio: IntervaloExercicio[] = [
  { openedAt: '2023-02-01 12:00:00+00', closedAt: null },
];

const encerradoAntesDaVotacao: IntervaloExercicio[] = [
  { openedAt: '2023-02-01 12:00:00+00', closedAt: '2023-03-01 12:00:00+00' },
];

const votacaoComData = {
  dataHoraRegistro: '2023-06-01 15:00:00+00',
  data: '2023-06-01',
};

describe('classifyDeputadoVotacao', () => {
  describe('when the deputy is in office but has no record in votacao_votos', () => {
    it('classifies as ausencia_sem_motivo_conhecido', () => {
      // Arrange
      const input = {
        intervalos: emExercicio,
        votacao: votacaoComData,
        voto: null,
      };

      // Act
      const classificacao = classifyDeputadoVotacao(input);

      // Assert
      expect(classificacao).toBe('ausencia_sem_motivo_conhecido');
    });
  });

  describe('when the deputy is in office and cast a computable vote', () => {
    it('returns the vote value itself', () => {
      // Arrange
      const sim = classifyDeputadoVotacao({
        intervalos: emExercicio,
        votacao: votacaoComData,
        voto: 'sim',
      });
      const abstencao = classifyDeputadoVotacao({
        intervalos: emExercicio,
        votacao: votacaoComData,
        voto: 'abstencao',
      });

      // Act + Assert
      expect(sim).toBe('sim');
      expect(abstencao).toBe('abstencao');
    });
  });

  describe('when the deputy is in office with an Artigo 17 record', () => {
    it('classifies as artigo_17, keeping it out of the denominator', () => {
      // Arrange
      const input = {
        intervalos: emExercicio,
        votacao: votacaoComData,
        voto: 'artigo_17' as const,
      };

      // Act
      const classificacao = classifyDeputadoVotacao(input);

      // Assert
      expect(classificacao).toBe('artigo_17');
    });
  });

  describe('when the history says out of office but a vote was recorded', () => {
    it('lets the vote record override the history, classifying by the vote', () => {
      // Act
      const comVotoComputavel = classifyDeputadoVotacao({
        intervalos: encerradoAntesDaVotacao,
        votacao: votacaoComData,
        voto: 'sim',
      });
      const comArtigo17 = classifyDeputadoVotacao({
        intervalos: encerradoAntesDaVotacao,
        votacao: votacaoComData,
        voto: 'artigo_17',
      });

      // Assert
      expect(comVotoComputavel).toBe('sim');
      expect(comArtigo17).toBe('artigo_17');
    });
  });

  describe('when the deputy is in office but the imported vote came empty', () => {
    it('classifies as voto_nao_informado, out of the denominator by data quality', () => {
      // Arrange
      const input = {
        intervalos: emExercicio,
        votacao: votacaoComData,
        voto: 'nao_informado' as const,
      };

      // Act
      const classificacao = classifyDeputadoVotacao(input);

      // Assert
      expect(classificacao).toBe('voto_nao_informado');
    });
  });

  describe('when the deputy is out of office and has no record in votacao_votos', () => {
    it('classifies as fora_de_exercicio, out of the denominator', () => {
      // Act
      const classificacao = classifyDeputadoVotacao({
        intervalos: encerradoAntesDaVotacao,
        votacao: votacaoComData,
        voto: null,
      });

      // Assert
      expect(classificacao).toBe('fora_de_exercicio');
    });
  });

  describe('when the vote has no usable date and there is no vote record', () => {
    it('classifies as lacuna_de_dados', () => {
      // Arrange
      const input = {
        intervalos: emExercicio,
        votacao: { dataHoraRegistro: null, data: null },
        voto: null,
      };

      // Act
      const classificacao = classifyDeputadoVotacao(input);

      // Assert
      expect(classificacao).toBe('lacuna_de_dados');
    });
  });

  describe('when the vote has no usable date but a vote was recorded', () => {
    it('classifies by the vote, since the record overrides the date gap', () => {
      // Arrange
      const input = {
        intervalos: emExercicio,
        votacao: { dataHoraRegistro: null, data: null },
        voto: 'sim' as const,
      };

      // Act
      const classificacao = classifyDeputadoVotacao(input);

      // Assert
      expect(classificacao).toBe('sim');
    });
  });

  describe('when there is no history for the deputy', () => {
    it('classifies as lacuna_de_dados', () => {
      // Arrange
      const input = {
        intervalos: [],
        votacao: votacaoComData,
        voto: null,
      };

      // Act
      const classificacao = classifyDeputadoVotacao(input);

      // Assert
      expect(classificacao).toBe('lacuna_de_dados');
    });
  });

  describe('when the votação only has a date and the term opened that same day', () => {
    it('still counts the deputy as in office', () => {
      // Arrange
      const abertoNaMeiaNoite: IntervaloExercicio[] = [
        { openedAt: '2023-02-01 00:00:00+00', closedAt: null },
      ];
      const input = {
        intervalos: abertoNaMeiaNoite,
        votacao: { dataHoraRegistro: null, data: '2023-02-01' },
        voto: null,
      };

      // Act
      const classificacao = classifyDeputadoVotacao(input);

      // Assert
      expect(classificacao).toBe('ausencia_sem_motivo_conhecido');
    });
  });

  describe('when the votação only has a date and the term closed that same day', () => {
    it('counts the deputy as out of office', () => {
      // Arrange
      const fechadoNaMeiaNoite: IntervaloExercicio[] = [
        {
          openedAt: '2019-02-01 00:00:00+00',
          closedAt: '2023-06-01 00:00:00+00',
        },
      ];
      const input = {
        intervalos: fechadoNaMeiaNoite,
        votacao: { dataHoraRegistro: null, data: '2023-06-01' },
        voto: null,
      };

      // Act
      const classificacao = classifyDeputadoVotacao(input);

      // Assert
      expect(classificacao).toBe('fora_de_exercicio');
    });
  });

  describe('when the votação date is stored in a different offset than the intervals', () => {
    it('compares the underlying instants, not the raw strings', () => {
      // Arrange
      const abertoAposAVotacao: IntervaloExercicio[] = [
        { openedAt: '2023-06-01 12:00:00+00', closedAt: null },
      ];
      const antesDaAbertura = {
        dataHoraRegistro: '2023-06-01 08:00:00-03',
        data: '2023-06-01',
      };

      // Act
      const classificacao = classifyDeputadoVotacao({
        intervalos: abertoAposAVotacao,
        votacao: antesDaAbertura,
        voto: null,
      });

      // Assert
      expect(classificacao).toBe('fora_de_exercicio');
    });
  });

  describe('when the votação carries an unparseable timestamp', () => {
    it('classifies as lacuna_de_dados instead of guessing', () => {
      // Arrange
      const input = {
        intervalos: emExercicio,
        votacao: { dataHoraRegistro: 'sem data', data: null },
        voto: null,
      };

      // Act
      const classificacao = classifyDeputadoVotacao(input);

      // Assert
      expect(classificacao).toBe('lacuna_de_dados');
    });
  });
});
