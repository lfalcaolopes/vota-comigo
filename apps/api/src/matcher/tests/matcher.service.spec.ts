import { BadRequestException } from '@nestjs/common';
import type {
  EscopoMatcher,
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
    escopo: 'estadual',
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

type EscopoCall = { escopo: EscopoMatcher; siglaUf: SiglaUf };

type FakeRepo = MatcherRepository & {
  computaveisCalls: number[][];
  votacoesCalls: number[][];
  escopoCalls: EscopoCall[];
};

function fakeRepository(options: FakeRepoOptions): FakeRepo {
  const computaveisCalls: number[][] = [];
  const votacoesCalls: number[][] = [];
  const escopoCalls: EscopoCall[] = [];
  return {
    computaveisCalls,
    votacoesCalls,
    escopoCalls,
    loadExternalIdProposicoesComputaveis: async (externalIdProposicoes) => {
      computaveisCalls.push([...externalIdProposicoes]);
      return options.computaveis;
    },
    loadVotacoesReferenciaWithVotos: async (externalIdProposicoes) => {
      votacoesCalls.push([...externalIdProposicoes]);
      return options.votacoes ?? [];
    },
    loadDeputadosByEscopoWithHistorico: async (escopo, siglaUf) => {
      escopoCalls.push({ escopo, siglaUf });
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

const pagina = { limit: 20, offset: 0 };

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
      const resultado = await service.execute(
        request({ cidade: 'Recife' }),
        pagina,
      );

      // Assert
      expect(resultado).toMatchObject({
        siglaUf: 'PE',
        cidade: 'Recife',
        totalProposicoesSelecionadas: 3,
        totalPosicoesComputaveis: 3,
        escopo: 'estadual',
        totalDeputadosAvaliados: 1,
        deputadosHistoricoIncompleto: 0,
        total: 1,
        limit: 20,
        offset: 0,
        semBomMatch: false,
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
          scoreOrdenacaoPercentual: 20.65,
          alertas: ['amostra_pequena'],
          emAtividade: true,
        },
      ]);
    });

    it('queries the repository with the state and the computable ids', async () => {
      // Arrange
      const repo = fakeRepository({ computaveis: new Set([1, 2, 3]) });
      const service = new MatcherService(repo);

      // Act
      await service.execute(request(), pagina);

      // Assert
      expect(repo.computaveisCalls).toEqual([[1, 2, 3]]);
      expect(repo.votacoesCalls).toEqual([[1, 2, 3]]);
      expect(repo.escopoCalls).toEqual([{ escopo: 'estadual', siglaUf: 'PE' }]);
    });
  });

  describe('when the escopo is nacional', () => {
    const votacoes: VotacaoReferenciaVotos[] = [
      {
        externalIdProposicao: 1,
        votacaoReferencia: {
          dataHoraRegistro: '2023-06-01T15:00:00Z',
          data: '2023-06-01',
        },
        votosByDeputado: new Map([
          ['dep-sp', 'sim'],
          ['dep-pe', 'nao'],
        ]),
      },
      {
        externalIdProposicao: 2,
        votacaoReferencia: {
          dataHoraRegistro: '2023-06-01T15:00:00Z',
          data: '2023-06-01',
        },
        votosByDeputado: new Map([
          ['dep-sp', 'sim'],
          ['dep-pe', 'nao'],
        ]),
      },
      {
        externalIdProposicao: 3,
        votacaoReferencia: {
          dataHoraRegistro: '2023-06-01T15:00:00Z',
          data: '2023-06-01',
        },
        votosByDeputado: new Map([
          ['dep-sp', 'sim'],
          ['dep-pe', 'nao'],
        ]),
      },
    ];

    // dep-sp concorda em tudo (bruta 100), dep-pe discorda em tudo (bruta 0)
    const deputados: DeputadoCompatibilidadeInput[] = [
      {
        deputadoId: 'dep-pe',
        externalIdDeputado: 200,
        nome: 'Pernambucano',
        partido: 'PT',
        siglaUf: 'PE',
        urlFoto: null,
        eventos: [posse],
      },
      {
        deputadoId: 'dep-sp',
        externalIdDeputado: 100,
        nome: 'Paulista',
        partido: 'PT',
        siglaUf: 'SP',
        urlFoto: null,
        eventos: [posse],
      },
    ];

    function reqAprovar(
      overrides: Partial<MatcherExecucaoRequest> = {},
    ): MatcherExecucaoRequest {
      return request({
        escopo: 'nacional',
        posicoes: [
          posicao({ externalIdProposicao: 1, posicao: 'aprovar' }),
          posicao({ externalIdProposicao: 2, posicao: 'aprovar' }),
          posicao({ externalIdProposicao: 3, posicao: 'aprovar' }),
        ],
        ...overrides,
      });
    }

    it('queries the repository with the nacional escopo and the informed UF', async () => {
      // Arrange
      const repo = fakeRepository({
        computaveis: new Set([1, 2, 3]),
        votacoes,
        deputados,
      });
      const service = new MatcherService(repo);

      // Act
      await service.execute(reqAprovar(), pagina);

      // Assert
      expect(repo.escopoCalls).toEqual([{ escopo: 'nacional', siglaUf: 'PE' }]);
    });

    it('returns deputados from UFs other than the informed one with nacional escopo', async () => {
      // Arrange
      const service = new MatcherService(
        fakeRepository({
          computaveis: new Set([1, 2, 3]),
          votacoes,
          deputados,
        }),
      );

      // Act
      const resultado = await service.execute(reqAprovar(), pagina);

      // Assert
      expect(resultado.escopo).toBe('nacional');
      expect(resultado.deputados.map((d) => d.siglaUf)).toEqual(['SP', 'PE']);
    });

    it('derives semBomMatch from the best result of the nacional set', async () => {
      // Arrange: o topo nacional (dep-sp) tem bruta 100, acima do mínimo
      const service = new MatcherService(
        fakeRepository({
          computaveis: new Set([1, 2, 3]),
          votacoes,
          deputados,
        }),
      );

      // Act
      const resultado = await service.execute(reqAprovar(), pagina);

      // Assert
      expect(resultado.deputados[0]?.compatibilidadeBruta).toBe(100);
      expect(resultado.semBomMatch).toBe(false);
    });
  });

  describe('when a selected proposicao is not computavel', () => {
    it('rejects with a BadRequestException', async () => {
      // Arrange
      const service = new MatcherService(
        fakeRepository({ computaveis: new Set([1, 2]) }),
      );

      // Act & Assert
      await expect(service.execute(request(), pagina)).rejects.toBeInstanceOf(
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
      await expect(service.execute(payload, pagina)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('when ranking, paginating and flagging the result', () => {
    function votacao(
      externalIdProposicao: number,
      votos: ReadonlyMap<string, 'sim' | 'nao'>,
    ): VotacaoReferenciaVotos {
      return {
        externalIdProposicao,
        votacaoReferencia: {
          dataHoraRegistro: '2023-06-01T15:00:00Z',
          data: '2023-06-01',
        },
        votosByDeputado: votos,
      };
    }

    function dep(
      deputadoId: string,
      externalIdDeputado: number,
    ): DeputadoCompatibilidadeInput {
      return {
        deputadoId,
        externalIdDeputado,
        nome: `Dep ${externalIdDeputado}`,
        partido: 'PT',
        siglaUf: 'PE',
        urlFoto: null,
        eventos: [posse],
      };
    }

    // três posições computáveis, todas aprovar; o deputado A concorda em todas,
    // B em duas, C em nenhuma -> ranking A, B, C por score
    const votacoes: VotacaoReferenciaVotos[] = [
      votacao(
        1,
        new Map([
          ['dep-a', 'sim'],
          ['dep-b', 'sim'],
          ['dep-c', 'nao'],
        ]),
      ),
      votacao(
        2,
        new Map([
          ['dep-a', 'sim'],
          ['dep-b', 'sim'],
          ['dep-c', 'nao'],
        ]),
      ),
      votacao(
        3,
        new Map([
          ['dep-a', 'sim'],
          ['dep-b', 'nao'],
          ['dep-c', 'nao'],
        ]),
      ),
    ];
    const deputados: DeputadoCompatibilidadeInput[] = [
      dep('dep-c', 3),
      dep('dep-a', 1),
      dep('dep-b', 2),
    ];

    // todas as posições são aprovar, alinhadas com os votos 'sim'/'nao' acima
    function reqAprovar(): MatcherExecucaoRequest {
      return request({
        posicoes: [
          posicao({ externalIdProposicao: 1, posicao: 'aprovar' }),
          posicao({ externalIdProposicao: 2, posicao: 'aprovar' }),
          posicao({ externalIdProposicao: 3, posicao: 'aprovar' }),
        ],
      });
    }

    function service(): MatcherService {
      return new MatcherService(
        fakeRepository({
          computaveis: new Set([1, 2, 3]),
          votacoes,
          deputados,
        }),
      );
    }

    it('sorts the deputados by scoreOrdenacaoPercentual desc', async () => {
      // Act
      const resultado = await service().execute(reqAprovar(), pagina);

      // Assert
      expect(resultado.deputados.map((d) => d.externalIdDeputado)).toEqual([
        1, 2, 3,
      ]);
    });

    it('slices the page and reports limit, offset and total', async () => {
      // Act
      const resultado = await service().execute(reqAprovar(), {
        limit: 1,
        offset: 1,
      });

      // Assert
      expect(resultado.total).toBe(3);
      expect(resultado.limit).toBe(1);
      expect(resultado.offset).toBe(1);
      expect(resultado.deputados.map((d) => d.externalIdDeputado)).toEqual([2]);
    });

    it('marks semBomMatch false when the top compatibilidadeBruta is at least 60', async () => {
      // Act
      const resultado = await service().execute(reqAprovar(), pagina);

      // Assert
      expect(resultado.deputados[0]?.compatibilidadeBruta).toBe(100);
      expect(resultado.semBomMatch).toBe(false);
    });

    it('marks semBomMatch true when the top compatibilidadeBruta is below 60', async () => {
      // Arrange: only dep-c, who disagrees everywhere -> bruta 0
      const onlyLow = new MatcherService(
        fakeRepository({
          computaveis: new Set([1, 2, 3]),
          votacoes,
          deputados: [dep('dep-c', 3)],
        }),
      );

      // Act
      const resultado = await onlyLow.execute(reqAprovar(), pagina);

      // Assert
      expect(resultado.deputados[0]?.compatibilidadeBruta).toBeLessThan(60);
      expect(resultado.semBomMatch).toBe(true);
    });

    it('marks semBomMatch true when the ranking is empty', async () => {
      // Arrange: no deputados evaluated
      const empty = new MatcherService(
        fakeRepository({
          computaveis: new Set([1, 2, 3]),
          votacoes,
          deputados: [],
        }),
      );

      // Act
      const resultado = await empty.execute(reqAprovar(), pagina);

      // Assert
      expect(resultado.deputados).toEqual([]);
      expect(resultado.semBomMatch).toBe(true);
    });

    it('does not flag amostra_pequena when the sample covers every computable position', async () => {
      // Act
      const resultado = await service().execute(reqAprovar(), pagina);

      // Assert: dep-a has 3 comparable votes over 3 computable positions
      expect(resultado.deputados[0]?.alertas).toEqual([]);
    });
  });
});
