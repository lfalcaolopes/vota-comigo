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
    partidos: [],
    sexo: null,
    ocultarAmostraPequena: false,
    externalIdProposicoesFiltroConcordancia: [],
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
  describe('when filtering by concordancia', () => {
    it('restricts deputados without recalculating compatibility', async () => {
      // Arrange
      const votacoes = [
        votacaoReferenciaVotos(
          1,
          new Map([
            ['dep-1', 'sim'],
            ['dep-2', 'nao'],
          ]),
        ),
        votacaoReferenciaVotos(
          2,
          new Map([
            ['dep-1', 'nao'],
            ['dep-2', 'sim'],
          ]),
        ),
        votacaoReferenciaVotos(
          3,
          new Map([
            ['dep-1', 'nao'],
            ['dep-2', 'sim'],
          ]),
        ),
      ];
      const deputados = [
        {
          deputadoId: 'dep-1',
          externalIdDeputado: 1,
          nome: 'Concorda no filtro',
          nomeEleitoral: null,
          nomeCivil: null,
          partido: 'PT',
          siglaSexo: 'F',
          siglaUf: 'PE' as const,
          urlFoto: null,
          intervalos: [emExercicio],
        },
        {
          deputadoId: 'dep-2',
          externalIdDeputado: 2,
          nome: 'Discorda no filtro',
          nomeEleitoral: null,
          nomeCivil: null,
          partido: 'PT',
          siglaSexo: 'F',
          siglaUf: 'PE' as const,
          urlFoto: null,
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
        request({
          posicoes: [
            posicao({ externalIdProposicao: 1, posicao: 'aprovar' }),
            posicao({ externalIdProposicao: 2, posicao: 'aprovar' }),
            posicao({ externalIdProposicao: 3, posicao: 'aprovar' }),
          ],
          externalIdProposicoesFiltroConcordancia: [1],
        }),
        pagina,
      );

      // Assert
      expect(resultado.total).toBe(1);
      expect(resultado.totalDeputadosAvaliados).toBe(1);
      expect(resultado.deputados[0]).toMatchObject({
        externalIdDeputado: 1,
        compatibilidadeBruta: 33.33,
      });
    });
  });

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
          siglaSexo: 'F',
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
        siglaSexo: 'F',
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
        siglaSexo: 'F',
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
      siglaSexo: 'F',
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
      siglaSexo: 'F',
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

    it('returns an empty result when the atividade filter removes everyone', async () => {
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

      // Assert
      expect(resultado.total).toBe(0);
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
        siglaSexo: 'F',
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
    function reqAprovar(
      overrides: Partial<MatcherExecucaoRequest> = {},
    ): MatcherExecucaoRequest {
      return request({
        posicoes: [
          posicao({ externalIdProposicao: 1, posicao: 'aprovar' }),
          posicao({ externalIdProposicao: 2, posicao: 'aprovar' }),
          posicao({ externalIdProposicao: 3, posicao: 'aprovar' }),
        ],
        ...overrides,
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

    it('returns an empty ranking when no deputado is evaluated', async () => {
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
    });

    it('does not flag amostra_pequena when the sample covers every computable position', async () => {
      // Act
      const resultado = await service().execute(reqAprovar(), pagina);

      // Assert: dep-a has 3 comparable votes over 3 computable positions
      expect(resultado.deputados[0]?.alertas).toEqual([]);
    });

    describe('and a recorte por partido is requested', () => {
      // dep-b passa a ser o único do PL; dep-a e dep-c continuam no PT
      const deputadosMistos: DeputadoCompatibilidadeInput[] = [
        dep('dep-a', 1),
        { ...dep('dep-b', 2), partido: 'PL' },
        dep('dep-c', 3),
      ];

      function servico(): MatcherService {
        return new MatcherService(
          fakeRepository({
            computaveis: new Set([1, 2, 3]),
            votacoes,
            deputados: deputadosMistos,
          }),
        );
      }

      it('keeps only the deputados of the requested partidos', async () => {
        // Act
        const resultado = await servico().execute(
          reqAprovar({ partidos: ['PL'] }),
          pagina,
        );

        // Assert
        expect(resultado.deputados.map((d) => d.externalIdDeputado)).toEqual([
          2,
        ]);
        expect(resultado.total).toBe(1);
      });

      it('keeps totalDeputadosAvaliados unchanged', async () => {
        // Act
        const resultado = await servico().execute(
          reqAprovar({ partidos: ['PL'] }),
          pagina,
        );

        // Assert: o recorte muda o conjunto exibido, não o avaliado
        expect(resultado.totalDeputadosAvaliados).toBe(3);
      });

      it('returns an empty result when no deputado belongs to the recorte', async () => {
        // Act
        const resultado = await servico().execute(
          reqAprovar({ partidos: ['PSOL'] }),
          pagina,
        );

        // Assert
        expect(resultado.deputados).toEqual([]);
        expect(resultado.total).toBe(0);
      });
    });

    describe('and ocultarAmostraPequena is requested', () => {
      // dep-parcial deixou o exercício antes das duas últimas votações, que ficam
      // fora do denominador dele: amostra 1 de 3 posições computáveis
      function emVotacaoTardia(
        votacaoReferencia: VotacaoReferenciaVotos,
      ): VotacaoReferenciaVotos {
        return {
          ...votacaoReferencia,
          votacaoReferencia: {
            data: '2024-06-01',
            dataHoraRegistro: '2024-06-01T15:00:00Z',
          },
        };
      }

      const votacoesComParcial: VotacaoReferenciaVotos[] = [
        votacao(
          1,
          new Map([
            ['dep-a', 'sim'],
            ['dep-parcial', 'sim'],
          ]),
        ),
        emVotacaoTardia(votacao(2, new Map([['dep-a', 'sim']]))),
        emVotacaoTardia(votacao(3, new Map([['dep-a', 'sim']]))),
      ];
      const comAmostraPequena: DeputadoCompatibilidadeInput[] = [
        dep('dep-a', 1),
        {
          ...dep('dep-parcial', 9),
          intervalos: [
            {
              openedAt: '2023-02-01T12:00:00Z',
              closedAt: '2023-12-01T12:00:00Z',
            },
          ],
        },
      ];

      function servico(): MatcherService {
        return new MatcherService(
          fakeRepository({
            computaveis: new Set([1, 2, 3]),
            votacoes: votacoesComParcial,
            deputados: comAmostraPequena,
          }),
        );
      }

      it('flags the deputado with a partial sample', async () => {
        // Act
        const resultado = await servico().execute(reqAprovar(), pagina);

        // Assert
        expect(
          resultado.deputados.find((d) => d.externalIdDeputado === 9)?.alertas,
        ).toEqual(['amostra_pequena']);
      });

      it('lists the deputado flagged with amostra_pequena when the recorte is off', async () => {
        // Act
        const resultado = await servico().execute(reqAprovar(), pagina);

        // Assert
        expect(resultado.deputados.map((d) => d.externalIdDeputado)).toContain(
          9,
        );
      });

      it('hides the deputados flagged with amostra_pequena', async () => {
        // Act
        const resultado = await servico().execute(
          reqAprovar({ ocultarAmostraPequena: true }),
          pagina,
        );

        // Assert
        expect(resultado.deputados.map((d) => d.externalIdDeputado)).toEqual([
          1,
        ]);
        expect(resultado.totalDeputadosAvaliados).toBe(2);
      });
    });

    describe('and a recorte por sexo is requested', () => {
      // dep-b passa a ser o único homem; dep-a e dep-c continuam mulheres
      const deputadosMistos: DeputadoCompatibilidadeInput[] = [
        dep('dep-a', 1),
        { ...dep('dep-b', 2), siglaSexo: 'M' },
        dep('dep-c', 3),
      ];

      function servico(): MatcherService {
        return new MatcherService(
          fakeRepository({
            computaveis: new Set([1, 2, 3]),
            votacoes,
            deputados: deputadosMistos,
          }),
        );
      }

      it('keeps only the deputados of the requested sexo', async () => {
        // Act
        const resultado = await servico().execute(
          reqAprovar({ sexo: 'M' }),
          pagina,
        );

        // Assert
        expect(resultado.deputados.map((d) => d.externalIdDeputado)).toEqual([
          2,
        ]);
        expect(resultado.total).toBe(1);
      });

      it('keeps totalDeputadosAvaliados unchanged', async () => {
        // Act
        const resultado = await servico().execute(
          reqAprovar({ sexo: 'M' }),
          pagina,
        );

        // Assert: o recorte muda o conjunto exibido, não o avaliado
        expect(resultado.totalDeputadosAvaliados).toBe(3);
      });

      it('combines with the recorte por partido', async () => {
        // Act: dep-b é o único homem, mas continua no PT
        const resultado = await servico().execute(
          reqAprovar({ sexo: 'M', partidos: ['PL'] }),
          pagina,
        );

        // Assert
        expect(resultado.deputados).toEqual([]);
        expect(resultado.total).toBe(0);
      });
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
    siglaSexo: 'F',
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

    it('keeps every vote when the ranking uses the concordancia filter', async () => {
      // Arrange
      const repo = repository();
      repo.loadVotacoesReferenciaWithVotos = async () => [
        votacaoReferenciaVotos(1, new Map([['dep-1', 'sim']])),
        votacaoReferenciaVotos(2, new Map([['dep-1', 'sim']])),
        votacaoReferenciaVotos(3, new Map([['dep-1', 'nao']])),
      ];

      // Act
      const detalhe = await new MatcherService(repo).detail(
        100,
        request({ externalIdProposicoesFiltroConcordancia: [1] }),
      );

      // Assert
      expect(detalhe.votos).toHaveLength(3);
      expect(detalhe.votos.map((voto) => voto.matcherEffect)).toEqual([
        'concordancia',
        'discordancia',
        'discordancia',
      ]);
    });
  });
});
