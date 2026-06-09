import { BadRequestException } from '@nestjs/common';
import type {
  MatcherExecucaoRequest,
  PosicaoMatcher,
  SiglaUf,
} from '@vota-comigo/shared-types';

import type { MatcherRepository } from '../matcher.repository';
import { MatcherService } from '../matcher.service';
import type {
  DeputadoCompatibilidadeInput,
  VotacaoReferenciaVotos,
} from '../types/compatibilidade.types';

function posicao(overrides: Partial<PosicaoMatcher> = {}): PosicaoMatcher {
  return {
    externalIdProposicao: 1,
    posicao: 'aprovar',
    ...overrides,
  };
}

function request(
  overrides: Partial<MatcherExecucaoRequest> = {},
): MatcherExecucaoRequest {
  return {
    siglaUf: 'PE',
    posicoes: [
      posicao({ externalIdProposicao: 1, posicao: 'aprovar' }),
      posicao({ externalIdProposicao: 2, posicao: 'rejeitar' }),
      posicao({ externalIdProposicao: 3, posicao: 'aprovar' }),
    ],
    ...overrides,
  };
}

type FakeRepoOptions = {
  computaveis: ReadonlySet<number>;
  votacoes?: readonly VotacaoReferenciaVotos[];
  deputados?: readonly DeputadoCompatibilidadeInput[];
};

type FakeRepo = MatcherRepository & {
  computaveisCalls: number[][];
  votacoesCalls: number[][];
  estadoCalls: SiglaUf[];
};

function fakeRepository(options: FakeRepoOptions): FakeRepo {
  const computaveisCalls: number[][] = [];
  const votacoesCalls: number[][] = [];
  const estadoCalls: SiglaUf[] = [];
  return {
    computaveisCalls,
    votacoesCalls,
    estadoCalls,
    loadExternalIdProposicoesComputaveis: async (externalIdProposicoes) => {
      computaveisCalls.push([...externalIdProposicoes]);
      return options.computaveis;
    },
    loadVotacoesReferenciaWithVotos: async (externalIdProposicoes) => {
      votacoesCalls.push([...externalIdProposicoes]);
      return options.votacoes ?? [];
    },
    loadDeputadosByEstadoWithHistorico: async (siglaUf) => {
      estadoCalls.push(siglaUf);
      return options.deputados ?? [];
    },
  };
}

const posse = {
  dataHora: '2023-02-01T12:00:00Z',
  situacao: 'Exercício',
  descricaoStatus: 'Entrada - Posse de Eleito Titular',
  partido: 'PT',
};

describe('MatcherService.execute', () => {
  describe('when the execution is valid', () => {
    it('returns the estadual result with the validation summary and engine deputados', async () => {
      // Arrange
      const votacoes: VotacaoReferenciaVotos[] = [
        {
          externalIdProposicao: 1,
          votacaoReferencia: {
            dataHoraRegistro: '2023-06-01T15:00:00Z',
            data: '2023-06-01',
          },
          votosByDeputado: new Map([['dep-1', 'sim']]),
        },
      ];
      const deputados: DeputadoCompatibilidadeInput[] = [
        {
          deputadoId: 'dep-1',
          externalIdDeputado: 100,
          nome: 'Fulano',
          partido: 'PT',
          siglaUf: 'PE',
          urlFoto: 'https://foto/dep-1.jpg',
          eventos: [posse],
        },
      ];
      const service = new MatcherService(
        fakeRepository({
          computaveis: new Set([1, 2, 3]),
          votacoes,
          deputados,
        }),
      );

      // Act
      const resultado = await service.execute(request({ cidade: 'Recife' }));

      // Assert
      expect(resultado).toMatchObject({
        siglaUf: 'PE',
        cidade: 'Recife',
        totalProposicoesSelecionadas: 3,
        totalPosicoesComputaveis: 3,
        escopo: 'estadual',
        totalDeputadosAvaliados: 1,
        deputadosHistoricoIncompleto: 0,
      });
      expect(resultado.deputados).toEqual([
        {
          externalIdDeputado: 100,
          nome: 'Fulano',
          partido: 'PT',
          siglaUf: 'PE',
          urlFoto: 'https://foto/dep-1.jpg',
          compatibilidadeBruta: 100,
          amostraComparavel: 1,
        },
      ]);
    });

    it('queries the repository with the state and the computable ids', async () => {
      // Arrange
      const repo = fakeRepository({ computaveis: new Set([1, 2, 3]) });
      const service = new MatcherService(repo);

      // Act
      await service.execute(request());

      // Assert
      expect(repo.computaveisCalls).toEqual([[1, 2, 3]]);
      expect(repo.votacoesCalls).toEqual([[1, 2, 3]]);
      expect(repo.estadoCalls).toEqual(['PE']);
    });
  });

  describe('when a selected proposicao is not computavel', () => {
    it('rejects with a BadRequestException', async () => {
      // Arrange
      const service = new MatcherService(
        fakeRepository({ computaveis: new Set([1, 2]) }),
      );

      // Act & Assert
      await expect(service.execute(request())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('when there are fewer than three computavel positions', () => {
    it('rejects with a BadRequestException', async () => {
      // Arrange
      const service = new MatcherService(
        fakeRepository({ computaveis: new Set([1, 2, 3]) }),
      );
      const payload = request({
        posicoes: [
          posicao({ externalIdProposicao: 1, posicao: 'aprovar' }),
          posicao({ externalIdProposicao: 2, posicao: 'rejeitar' }),
          posicao({ externalIdProposicao: 3, posicao: 'nao_sei' }),
        ],
      });

      // Act & Assert
      await expect(service.execute(payload)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
