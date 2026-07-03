import { BadRequestException } from '@nestjs/common';
import type {
  EscopoMatcher,
  MatcherExecucaoRequest,
  PosicaoMatcher,
  SiglaUf,
} from '@vota-comigo/shared-types';

import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

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
    apenasEmAtividade: false,
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
    loadDeputadoByExternalIdWithHistorico: async () => null,
  };
}

const emExercicio: IntervaloExercicio = {
  openedAt: '2023-02-01T12:00:00Z',
  closedAt: null,
};

function votacaoReferenciaVotos(
  externalIdProposicao: number,
  votosByDeputado: ReadonlyMap<string, 'sim' | 'nao'>,
): VotacaoReferenciaVotos {
  return {
    externalIdProposicao,
    proposicao: {
      externalIdProposicao,
      siglaTipo: 'PL',
      numero: externalIdProposicao,
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
      externalIdVotacao: String(externalIdProposicao),
      data: '2023-06-01',
      descricao: 'Aprovado o projeto de lei',
      pattern: 'projeto_de_lei',
      votosSim: 1,
      votosNao: 0,
      votosOutros: 0,
      resultado: 'aprovada',
    },
    votosByDeputado,
  };
}

const pagina = { limit: 20, offset: 0 };

describe('MatcherService.execute', () => {
  describe('when the execution is valid', () => {
    it('returns the estadual result with the validation summary and engine deputados', async () => {
      // Arrange
      const votacoes: VotacaoReferenciaVotos[] = [
        votacaoReferenciaVotos(1, new Map([['dep-1', 'sim']])),
      ];
      const deputados: DeputadoCompatibilidadeInput[] = [
        {
          deputadoId: 'dep-1',
          externalIdDeputado: 100,
          nome: 'Fulano',
          nomeEleitoral: null,
          nomeCivil: null,
          partido: 'PT',
          siglaUf: 'PE',
          urlFoto: 'https://foto/dep-1.jpg',
          intervalos: [emExercicio],
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
      votacaoReferenciaVotos(
        1,
        new Map([
          ['dep-sp', 'sim'],
          ['dep-pe', 'nao'],
        ]),
      ),
      votacaoReferenciaVotos(
        2,
        new Map([
          ['dep-sp', 'sim'],
          ['dep-pe', 'nao'],
        ]),
      ),
      votacaoReferenciaVotos(
        3,
        new Map([
          ['dep-sp', 'sim'],
          ['dep-pe', 'nao'],
        ]),
      ),
    ];

    // dep-sp concorda em tudo (bruta 100), dep-pe discorda em tudo (bruta 0)
    const deputados: DeputadoCompatibilidadeInput[] = [
      {
        deputadoId: 'dep-pe',
        externalIdDeputado: 200,
        nome: 'Pernambucano',
        nomeEleitoral: null,
        nomeCivil: null,
        partido: 'PT',
        siglaUf: 'PE',
        urlFoto: null,
        intervalos: [emExercicio],
      },
      {
        deputadoId: 'dep-sp',
        externalIdDeputado: 100,
        nome: 'Paulista',
        nomeEleitoral: null,
        nomeCivil: null,
        partido: 'PT',
        siglaUf: 'SP',
        urlFoto: null,
        intervalos: [emExercicio],
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

    it('floats deputados from the informed UF above tied ones from other UFs', async () => {
      // Arrange: dep-pe e dep-sp votam igual em tudo -> mesmo score e bruta
      const empate: VotacaoReferenciaVotos[] = [1, 2, 3].map(
        (externalIdProposicao) =>
          votacaoReferenciaVotos(
            externalIdProposicao,
            new Map([
              ['dep-sp', 'sim'],
              ['dep-pe', 'sim'],
            ]),
          ),
      );
      const service = new MatcherService(
        fakeRepository({
          computaveis: new Set([1, 2, 3]),
          votacoes: empate,
          deputados,
        }),
      );

      // Act
      const resultado = await service.execute(reqAprovar(), pagina);

      // Assert: UF informada (PE) no topo, apesar de empatar com SP
      expect(resultado.deputados.map((d) => d.siglaUf)).toEqual(['PE', 'SP']);
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

  describe('when filtering by emAtividade', () => {
    const votacoes: VotacaoReferenciaVotos[] = [
      votacaoReferenciaVotos(
        1,
        new Map([
          ['dep-ativo', 'sim'],
          ['dep-inativo', 'sim'],
        ]),
      ),
      votacaoReferenciaVotos(
        2,
        new Map([
          ['dep-ativo', 'sim'],
          ['dep-inativo', 'sim'],
        ]),
      ),
      votacaoReferenciaVotos(
        3,
        new Map([
          ['dep-ativo', 'sim'],
          ['dep-inativo', 'sim'],
        ]),
      ),
    ];

    // dep-ativo tem intervalo aberto; dep-inativo tem apenas intervalo encerrado
    const deputadoAtivo: DeputadoCompatibilidadeInput = {
      deputadoId: 'dep-ativo',
      externalIdDeputado: 1,
      nome: 'Ativo',
      nomeEleitoral: null,
      nomeCivil: null,
      partido: 'PT',
      siglaUf: 'PE',
      urlFoto: null,
      intervalos: [emExercicio],
    };
    const deputadoInativo: DeputadoCompatibilidadeInput = {
      deputadoId: 'dep-inativo',
      externalIdDeputado: 2,
      nome: 'Inativo',
      nomeEleitoral: null,
      nomeCivil: null,
      partido: 'PT',
      siglaUf: 'PE',
      urlFoto: null,
      intervalos: [
        { openedAt: '2023-02-01T12:00:00Z', closedAt: '2024-01-01T12:00:00Z' },
      ],
    };

    const reqAprovar = (
      overrides: Partial<MatcherExecucaoRequest> = {},
    ): MatcherExecucaoRequest =>
      request({
        posicoes: [
          posicao({ externalIdProposicao: 1, posicao: 'aprovar' }),
          posicao({ externalIdProposicao: 2, posicao: 'aprovar' }),
          posicao({ externalIdProposicao: 3, posicao: 'aprovar' }),
        ],
        ...overrides,
      });

    it('includes both active and inactive deputados when apenasEmAtividade is false (default)', async () => {
      // Arrange
      const service = new MatcherService(
        fakeRepository({
          computaveis: new Set([1, 2, 3]),
          votacoes,
          deputados: [deputadoAtivo, deputadoInativo],
        }),
      );

      // Act
      const resultado = await service.execute(
        reqAprovar({ apenasEmAtividade: false }),
        pagina,
      );

      // Assert
      expect(resultado.total).toBe(2);
      expect(resultado.deputados.map((d) => d.externalIdDeputado)).toContain(1);
      expect(resultado.deputados.map((d) => d.externalIdDeputado)).toContain(2);
    });

    it('excludes inactive deputados when apenasEmAtividade is true', async () => {
      // Arrange
      const service = new MatcherService(
        fakeRepository({
          computaveis: new Set([1, 2, 3]),
          votacoes,
          deputados: [deputadoAtivo, deputadoInativo],
        }),
      );

      // Act
      const resultado = await service.execute(
        reqAprovar({ apenasEmAtividade: true }),
        pagina,
      );

      // Assert
      expect(resultado.total).toBe(1);
      expect(resultado.deputados.map((d) => d.externalIdDeputado)).toEqual([1]);
    });

    it('keeps totalDeputadosAvaliados unchanged regardless of the filter', async () => {
      // Arrange
      const service = new MatcherService(
        fakeRepository({
          computaveis: new Set([1, 2, 3]),
          votacoes,
          deputados: [deputadoAtivo, deputadoInativo],
        }),
      );

      // Act
      const resultado = await service.execute(
        reqAprovar({ apenasEmAtividade: true }),
        pagina,
      );

      // Assert: both were evaluated; only the display set is filtered
      expect(resultado.totalDeputadosAvaliados).toBe(2);
    });

    it('derives semBomMatch from the filtered set when apenasEmAtividade is true', async () => {
      // Arrange: only inactive deputados evaluated
      const service = new MatcherService(
        fakeRepository({
          computaveis: new Set([1, 2, 3]),
          votacoes,
          deputados: [deputadoInativo],
        }),
      );

      // Act: filter active only -> empty set
      const resultado = await service.execute(
        reqAprovar({ apenasEmAtividade: true }),
        pagina,
      );

      // Assert: empty filtered set -> semBomMatch true
      expect(resultado.total).toBe(0);
      expect(resultado.semBomMatch).toBe(true);
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
      return votacaoReferenciaVotos(externalIdProposicao, votos);
    }

    function dep(
      deputadoId: string,
      externalIdDeputado: number,
    ): DeputadoCompatibilidadeInput {
      return {
        deputadoId,
        externalIdDeputado,
        nome: `Dep ${externalIdDeputado}`,
        nomeEleitoral: null,
        nomeCivil: null,
        partido: 'PT',
        siglaUf: 'PE',
        urlFoto: null,
        intervalos: [emExercicio],
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

describe('MatcherService and the public name of the deputado', () => {
  const votacoes: VotacaoReferenciaVotos[] = [
    votacaoReferenciaVotos(1, new Map([['dep-1', 'sim']])),
  ];

  // nomeEleitoral do snapshot mais recente é o Nome público do deputado
  const deputado: DeputadoCompatibilidadeInput = {
    deputadoId: 'dep-1',
    externalIdDeputado: 100,
    nome: 'Jose Nome Cadastro',
    nomeEleitoral: 'Ze do Povo',
    nomeCivil: 'Jose da Silva Souza',
    partido: 'PT',
    siglaUf: 'PE',
    urlFoto: 'https://foto/recente.jpg',
    intervalos: [emExercicio],
  };

  function repository(): MatcherRepository {
    return {
      ...fakeRepository({
        computaveis: new Set([1, 2, 3]),
        votacoes,
        deputados: [deputado],
      }),
      loadDeputadoByExternalIdWithHistorico: async () => deputado,
    };
  }

  describe('when returning the ranked result', () => {
    it('derives the result nome from the public name', async () => {
      // Act
      const resultado = await new MatcherService(repository()).execute(
        request(),
        pagina,
      );

      // Assert
      expect(resultado.deputados[0]?.nome).toBe('Ze do Povo');
      expect(resultado.deputados[0]?.urlFoto).toBe('https://foto/recente.jpg');
    });
  });

  describe('when returning the detail of a deputado', () => {
    it('derives the detail nome from the public name', async () => {
      // Act
      const detalhe = await new MatcherService(repository()).detail(
        100,
        request(),
      );

      // Assert
      expect(detalhe.deputado.nome).toBe('Ze do Povo');
      expect(detalhe.deputado.urlFoto).toBe('https://foto/recente.jpg');
    });
  });
});
