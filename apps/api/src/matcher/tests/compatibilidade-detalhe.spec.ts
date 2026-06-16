import type { ProposicaoCard, VotoCategoria } from '@vota-comigo/shared-types';

import type { EventoExercicio } from '@/exercicio/types/exercicio.types';

import { computeCompatibilidadeDetalhe } from '../rules/compatibilidade-detalhe';
import type {
  DeputadoCompatibilidadeInput,
  PosicaoComputavel,
} from '../types/compatibilidade.types';

const posse: EventoExercicio = {
  dataHora: '2023-02-01T12:00:00Z',
  situacao: 'Exercício',
  descricaoStatus: 'Entrada - Posse de Eleito Titular',
  partido: 'PT',
};

function proposicao(externalIdProposicao: number): ProposicaoCard {
  return {
    externalIdProposicao,
    siglaTipo: 'PL',
    numero: externalIdProposicao,
    ano: 2024,
    ementa: 'Proposição de teste',
    dataApresentacao: '2023-12-01T10:00:00Z',
    volumeVotacoesPlenario: 1,
    dataUltimaVotacao: '2024-01-01',
  };
}

function posicao(
  externalIdProposicao: number,
  voto: VotoCategoria | null,
  overrides: Partial<Pick<PosicaoComputavel, 'votacaoReferencia'>> = {},
): PosicaoComputavel {
  return {
    externalIdProposicao,
    posicao: 'aprovar',
    proposicao: proposicao(externalIdProposicao),
    votacaoReferencia: {
      dataHoraRegistro: '2024-01-01T12:00:00Z',
      data: '2024-01-01',
    },
    votacaoReferenciaResumo: {
      externalIdVotacao: String(externalIdProposicao),
      data: '2024-01-01',
      descricao: 'Aprovado o projeto de lei',
      pattern: 'projeto_de_lei',
      votosSim: 1,
      votosNao: 0,
      votosOutros: 0,
      resultado: 'aprovada',
    },
    votosByDeputado: voto === null ? new Map() : new Map([['dep-1', voto]]),
    ...overrides,
  };
}

function deputado(
  overrides: Partial<DeputadoCompatibilidadeInput> = {},
): DeputadoCompatibilidadeInput {
  return {
    deputadoId: 'dep-1',
    externalIdDeputado: 100,
    nome: 'Fulano',
    nomeEleitoral: null,
    nomeCivil: null,
    partido: 'PT',
    siglaUf: 'PE',
    urlFoto: null,
    eventos: [posse],
    ...overrides,
  };
}

describe('computeCompatibilidadeDetalhe', () => {
  describe('when detailing votes for a deputado', () => {
    it('classifies concordance, disagreement and out-of-denominator effects', () => {
      // Arrange
      const posicoes = [
        posicao(1, 'sim'),
        posicao(2, 'nao'),
        posicao(3, 'artigo_17'),
      ];

      // Act
      const detalhe = computeCompatibilidadeDetalhe({
        posicoes,
        deputado: deputado(),
        totalPosicoesComputaveis: 3,
      });

      // Assert
      expect(detalhe.metrics).toMatchObject({
        totalConcordancias: 1,
        totalDiscordancias: 1,
        totalForaDoDenominador: 1,
        amostraComparavel: 2,
        coberturaExercicio: 3,
        compatibilidadeBruta: 50,
      });
      expect(detalhe.votos.map((voto) => voto.matcherEffect)).toEqual([
        'concordancia',
        'discordancia',
        'fora_do_denominador',
      ]);
      expect(detalhe.votos.map((voto) => voto.situacaoDeputadoVotacao)).toEqual(
        ['sim', 'nao', 'artigo_17'],
      );
    });

    it('keeps abstencao, obstrucao and ausencia as disagreement details', () => {
      // Arrange
      const posicoes = [
        posicao(1, 'abstencao'),
        posicao(2, 'obstrucao'),
        posicao(3, null),
      ];

      // Act
      const detalhe = computeCompatibilidadeDetalhe({
        posicoes,
        deputado: deputado(),
        totalPosicoesComputaveis: 3,
      });

      // Assert
      expect(detalhe.metrics).toMatchObject({
        totalConcordancias: 0,
        totalDiscordancias: 3,
        totalForaDoDenominador: 0,
        amostraComparavel: 3,
        compatibilidadeBruta: 0,
      });
      expect(detalhe.votos.map((voto) => voto.situacaoDeputadoVotacao)).toEqual(
        ['abstencao', 'obstrucao', 'ausencia_sem_motivo_conhecido'],
      );
      expect(detalhe.votos.map((voto) => voto.matcherEffect)).toEqual([
        'discordancia',
        'discordancia',
        'discordancia',
      ]);
    });

    it('keeps out-of-denominator situations distinct from each other', () => {
      // Arrange
      const posicoes = [
        posicao(1, null, {
          votacaoReferencia: {
            dataHoraRegistro: '2022-01-01T12:00:00Z',
            data: '2022-01-01',
          },
        }),
        posicao(2, 'artigo_17'),
        posicao(3, 'nao_informado'),
      ];

      // Act
      const detalhe = computeCompatibilidadeDetalhe({
        posicoes,
        deputado: deputado(),
        totalPosicoesComputaveis: 3,
      });

      // Assert
      expect(detalhe.metrics).toMatchObject({
        totalConcordancias: 0,
        totalDiscordancias: 0,
        totalForaDoDenominador: 3,
        amostraComparavel: 0,
        coberturaExercicio: 2,
      });
      expect(detalhe.votos.map((voto) => voto.situacaoDeputadoVotacao)).toEqual(
        ['fora_de_exercicio', 'artigo_17', 'voto_nao_informado'],
      );
      expect(detalhe.votos.map((voto) => voto.matcherEffect)).toEqual([
        'fora_do_denominador',
        'fora_do_denominador',
        'fora_do_denominador',
      ]);
    });
  });
});
