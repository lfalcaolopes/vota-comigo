import type { VotoCategoria } from '@vota-comigo/shared-types';

import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import { passesFiltroConcordancia } from '../rules/filtro-concordancia';
import type {
  DeputadoCompatibilidadeInput,
  PosicaoComputavel,
} from '../types/compatibilidade.types';

const emExercicio: IntervaloExercicio = {
  openedAt: '2023-02-01T12:00:00Z',
  closedAt: null,
};

function deputado(
  overrides: Partial<DeputadoCompatibilidadeInput> = {},
): DeputadoCompatibilidadeInput {
  return {
    deputadoId: 'dep-1',
    externalIdDeputado: 100,
    nome: 'Fulano de Tal',
    nomeEleitoral: null,
    nomeCivil: null,
    partido: 'PT',
    siglaSexo: 'F',
    siglaUf: 'PE',
    urlFoto: null,
    intervalos: [emExercicio],
    ...overrides,
  };
}

function posicao(
  posicaoUsuario: PosicaoComputavel['posicao'],
  voto?: VotoCategoria,
): PosicaoComputavel {
  return {
    externalIdProposicao: 1,
    posicao: posicaoUsuario,
    proposicao: {
      externalIdProposicao: 1,
      siglaTipo: 'PL',
      numero: 1,
      ano: 2024,
      ementa: 'Proposição de teste',
      resumoIaDisponivel: false,
      resumoIaCard: null,
      dataApresentacao: '2023-12-01T10:00:00Z',
      volumeVotacoesPlenario: 1,
      dataUltimaVotacao: '2023-06-01',
    },
    votacaoReferencia: {
      dataHoraRegistro: '2023-06-01T15:00:00Z',
      data: '2023-06-01',
    },
    votacaoReferenciaResumo: {
      externalIdVotacao: '1',
      data: '2023-06-01',
      descricao: 'Aprovado o projeto de lei',
      pattern: 'projeto_de_lei',
      votosSim: 1,
      votosNao: 0,
      votosOutros: 0,
      resultado: 'aprovada',
    },
    votosByDeputado:
      voto === undefined ? new Map() : new Map([['dep-1', voto]]),
  };
}

describe('passesFiltroConcordancia', () => {
  describe('when the deputado agrees with the marked position', () => {
    it('accepts aprovar with a sim vote', () => {
      // Arrange
      const marcada = posicao('aprovar', 'sim');

      // Act
      const result = passesFiltroConcordancia(deputado(), [marcada]);

      // Assert
      expect(result).toBe(true);
    });

    it('accepts rejeitar with a nao vote', () => {
      // Arrange
      const marcada = posicao('rejeitar', 'nao');

      // Act
      const result = passesFiltroConcordancia(deputado(), [marcada]);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('when the deputado does not agree with a marked position', () => {
    it('rejects an opposite computable vote', () => {
      // Arrange
      const marcada = posicao('aprovar', 'nao');

      // Act
      const result = passesFiltroConcordancia(deputado(), [marcada]);

      // Assert
      expect(result).toBe(false);
    });

    it.each<VotoCategoria>([
      'abstencao',
      'obstrucao',
      'artigo_17',
      'nao_informado',
    ])('rejects the %s classification', (voto) => {
      // Arrange
      const marcada = posicao('aprovar', voto);

      // Act
      const result = passesFiltroConcordancia(deputado(), [marcada]);

      // Assert
      expect(result).toBe(false);
    });

    it('rejects ausencia sem motivo conhecido', () => {
      // Arrange
      const marcada = posicao('aprovar');

      // Act
      const result = passesFiltroConcordancia(deputado(), [marcada]);

      // Assert
      expect(result).toBe(false);
    });

    it('rejects absence of em exercicio', () => {
      // Arrange
      const marcada = posicao('aprovar');
      const foraDeExercicio = deputado({
        intervalos: [
          {
            openedAt: '2022-01-01T12:00:00Z',
            closedAt: '2022-12-01T12:00:00Z',
          },
        ],
      });

      // Act
      const result = passesFiltroConcordancia(foraDeExercicio, [marcada]);

      // Assert
      expect(result).toBe(false);
    });

    it('rejects lacuna de dados', () => {
      // Arrange
      const marcada = posicao('aprovar');
      const semHistorico = deputado({ intervalos: [] });

      // Act
      const result = passesFiltroConcordancia(semHistorico, [marcada]);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('when multiple positions are marked', () => {
    it('requires agreement with every marked position', () => {
      // Arrange
      const marcadas = [posicao('aprovar', 'sim'), posicao('rejeitar', 'sim')];

      // Act
      const result = passesFiltroConcordancia(deputado(), marcadas);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('when no position is marked', () => {
    it('accepts every deputado', () => {
      // Act
      const result = passesFiltroConcordancia(deputado(), []);

      // Assert
      expect(result).toBe(true);
    });
  });
});
