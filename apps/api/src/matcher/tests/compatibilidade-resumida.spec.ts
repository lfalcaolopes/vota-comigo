import type { VotoCategoria } from '@vota-comigo/shared-types';

import type { EventoExercicio } from '@/exercicio/types/exercicio.types';

import { computeCompatibilidadeResumida } from '../rules/compatibilidade-resumida';
import type { ComputeCompatibilidadeResumidaInput } from '../rules/compatibilidade-resumida';
import type {
  DeputadoCompatibilidadeInput,
  PosicaoComputavel,
} from '../types/compatibilidade.types';

type ComputeInput = Omit<
  ComputeCompatibilidadeResumidaInput,
  'totalPosicoesComputaveis'
> & {
  totalPosicoesComputaveis?: number;
};

function compute(
  input: ComputeInput,
): ReturnType<typeof computeCompatibilidadeResumida> {
  return computeCompatibilidadeResumida({
    posicoes: input.posicoes,
    deputados: input.deputados,
    totalPosicoesComputaveis:
      input.totalPosicoesComputaveis ?? input.posicoes.length,
  });
}

const posse: EventoExercicio = {
  dataHora: '2023-02-01T12:00:00Z',
  situacao: 'Exercício',
  descricaoStatus: 'Entrada - Posse de Eleito Titular',
  partido: 'PT',
};

const eventoNeutro: EventoExercicio = {
  dataHora: '2023-02-01T12:00:00Z',
  situacao: 'Exercício',
  descricaoStatus: 'Alteração de gabinete',
  partido: 'PT',
};

const instanteDentro = {
  dataHoraRegistro: '2023-06-01T15:00:00Z',
  data: '2023-06-01',
};

function posicao(
  overrides: Partial<PosicaoComputavel> = {},
): PosicaoComputavel {
  return {
    externalIdProposicao: 1,
    posicao: 'aprovar',
    proposicao: {
      externalIdProposicao: 1,
      siglaTipo: 'PL',
      numero: 1,
      ano: 2024,
      ementa: 'Proposição de teste',
      dataApresentacao: '2023-12-01T10:00:00Z',
      volumeVotacoesPlenario: 1,
      dataUltimaVotacao: '2023-06-01',
    },
    votacaoReferencia: instanteDentro,
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
    votosByDeputado: new Map(),
    ...overrides,
  };
}

function votos(
  voto: VotoCategoria,
  deputadoId = 'dep-1',
): ReadonlyMap<string, VotoCategoria> {
  return new Map([[deputadoId, voto]]);
}

function deputado(
  overrides: Partial<DeputadoCompatibilidadeInput> = {},
): DeputadoCompatibilidadeInput {
  return {
    deputadoId: 'dep-1',
    externalIdDeputado: 100,
    nome: 'Fulano de Tal',
    partido: 'PT',
    siglaUf: 'PE',
    urlFoto: 'https://foto/dep-1.jpg',
    eventos: [posse],
    ...overrides,
  };
}

describe('computeCompatibilidadeResumida', () => {
  describe('when classifying agreement against the user position', () => {
    it('counts aprovar+sim as agreement and aprovar+nao as disagreement', () => {
      // Arrange
      const concorda = compute({
        posicoes: [
          posicao({ posicao: 'aprovar', votosByDeputado: votos('sim') }),
        ],
        deputados: [deputado()],
      });
      const discorda = compute({
        posicoes: [
          posicao({ posicao: 'aprovar', votosByDeputado: votos('nao') }),
        ],
        deputados: [deputado()],
      });

      // Assert
      expect(concorda.deputados[0]?.compatibilidadeBruta).toBe(100);
      expect(discorda.deputados[0]?.compatibilidadeBruta).toBe(0);
    });

    it('counts rejeitar+nao as agreement and rejeitar+sim as disagreement', () => {
      // Arrange
      const concorda = compute({
        posicoes: [
          posicao({ posicao: 'rejeitar', votosByDeputado: votos('nao') }),
        ],
        deputados: [deputado()],
      });
      const discorda = compute({
        posicoes: [
          posicao({ posicao: 'rejeitar', votosByDeputado: votos('sim') }),
        ],
        deputados: [deputado()],
      });

      // Assert
      expect(concorda.deputados[0]?.compatibilidadeBruta).toBe(100);
      expect(discorda.deputados[0]?.compatibilidadeBruta).toBe(0);
    });
  });

  describe('when the same vote is compared regardless of the votacao result', () => {
    it('derives the expectation from the user position alone, never inverting', () => {
      // Arrange: identical vote 'sim', the only difference is the user position
      const aprovar = compute({
        posicoes: [
          posicao({ posicao: 'aprovar', votosByDeputado: votos('sim') }),
        ],
        deputados: [deputado()],
      });
      const rejeitar = compute({
        posicoes: [
          posicao({ posicao: 'rejeitar', votosByDeputado: votos('sim') }),
        ],
        deputados: [deputado()],
      });

      // Assert
      expect(aprovar.deputados[0]?.compatibilidadeBruta).toBe(100);
      expect(rejeitar.deputados[0]?.compatibilidadeBruta).toBe(0);
    });
  });

  describe('when the classification stays in the denominator but never agrees', () => {
    it.each<VotoCategoria>(['abstencao', 'obstrucao'])(
      'counts %s as a comparable disagreement',
      (voto) => {
        // Act
        const result = compute({
          posicoes: [
            posicao({ posicao: 'aprovar', votosByDeputado: votos(voto) }),
          ],
          deputados: [deputado()],
        });

        // Assert
        expect(result.deputados[0]?.amostraComparavel).toBe(1);
        expect(result.deputados[0]?.compatibilidadeBruta).toBe(0);
      },
    );

    it('counts ausencia_sem_motivo_conhecido as a comparable disagreement', () => {
      // Arrange: in office, no vote record -> ausencia_sem_motivo_conhecido
      const result = compute({
        posicoes: [posicao({ posicao: 'aprovar', votosByDeputado: new Map() })],
        deputados: [deputado({ eventos: [posse] })],
      });

      // Assert
      expect(result.deputados[0]?.amostraComparavel).toBe(1);
      expect(result.deputados[0]?.compatibilidadeBruta).toBe(0);
    });
  });

  describe('when the classification stays out of the denominator', () => {
    it('ignores artigo_17 and voto_nao_informado for the sample', () => {
      // Arrange: one comparable agreement plus excluded classifications
      const result = compute({
        posicoes: [
          posicao({
            externalIdProposicao: 1,
            posicao: 'aprovar',
            votosByDeputado: votos('sim'),
          }),
          posicao({
            externalIdProposicao: 2,
            posicao: 'aprovar',
            votosByDeputado: votos('artigo_17'),
          }),
          posicao({
            externalIdProposicao: 3,
            posicao: 'aprovar',
            votosByDeputado: votos('nao_informado'),
          }),
        ],
        deputados: [deputado()],
      });

      // Assert
      expect(result.deputados[0]?.amostraComparavel).toBe(1);
      expect(result.deputados[0]?.compatibilidadeBruta).toBe(100);
    });

    it('ignores fora_de_exercicio and lacuna_de_dados for the sample', () => {
      // Arrange
      const result = compute({
        posicoes: [
          posicao({
            externalIdProposicao: 1,
            posicao: 'aprovar',
            votosByDeputado: votos('sim'),
          }),
          // votação anterior à posse -> fora_de_exercicio
          posicao({
            externalIdProposicao: 2,
            posicao: 'aprovar',
            votacaoReferencia: {
              dataHoraRegistro: '2022-01-01T15:00:00Z',
              data: '2022-01-01',
            },
            votosByDeputado: new Map(),
          }),
          // votação sem instante derivável -> lacuna_de_dados
          posicao({
            externalIdProposicao: 3,
            posicao: 'aprovar',
            votacaoReferencia: { dataHoraRegistro: null, data: null },
            votosByDeputado: new Map(),
          }),
        ],
        deputados: [deputado({ eventos: [posse] })],
      });

      // Assert
      expect(result.deputados[0]?.amostraComparavel).toBe(1);
      expect(result.deputados[0]?.compatibilidadeBruta).toBe(100);
    });
  });

  describe('when distinguishing zero sample from incomplete history', () => {
    it('excludes both but only counts incomplete history as a gap', () => {
      // Arrange
      const semHistorico = deputado({
        deputadoId: 'dep-gap',
        externalIdDeputado: 1,
        eventos: [eventoNeutro],
      });
      const semAmostra = deputado({
        deputadoId: 'dep-zero',
        externalIdDeputado: 2,
        eventos: [posse],
      });
      const comAmostra = deputado({
        deputadoId: 'dep-ok',
        externalIdDeputado: 3,
        eventos: [posse],
      });

      // Act
      const result = compute({
        posicoes: [
          posicao({
            posicao: 'aprovar',
            votosByDeputado: new Map<string, VotoCategoria>([
              ['dep-zero', 'artigo_17'],
              ['dep-ok', 'sim'],
            ]),
          }),
        ],
        deputados: [semHistorico, semAmostra, comAmostra],
      });

      // Assert
      expect(result.deputados).toHaveLength(1);
      expect(result.deputados[0]?.externalIdDeputado).toBe(3);
      expect(result.deputadosHistoricoIncompleto).toBe(1);
      expect(result.totalDeputadosAvaliados).toBe(3);
    });
  });

  describe('when scaling compatibility to a 0..100 percentage', () => {
    function withMatches(
      matches: number,
      total: number,
    ): ReturnType<typeof computeCompatibilidadeResumida> {
      const posicoes = Array.from({ length: total }, (_unused, index) =>
        posicao({
          externalIdProposicao: index + 1,
          posicao: 'aprovar',
          votosByDeputado: votos(index < matches ? 'sim' : 'nao'),
        }),
      );
      return compute({
        posicoes,
        deputados: [deputado()],
      });
    }

    it('rounds one of three to 33.33', () => {
      expect(withMatches(1, 3).deputados[0]?.compatibilidadeBruta).toBe(33.33);
    });

    it('rounds two of three to 66.67', () => {
      expect(withMatches(2, 3).deputados[0]?.compatibilidadeBruta).toBe(66.67);
    });

    it('scores three of three as 100', () => {
      expect(withMatches(3, 3).deputados[0]?.compatibilidadeBruta).toBe(100);
    });

    it('scores zero of two as 0', () => {
      expect(withMatches(0, 2).deputados[0]?.compatibilidadeBruta).toBe(0);
    });
  });

  describe('when emitting the summary for an evaluated deputado', () => {
    it('passes through the basic data and totals', () => {
      // Act
      const result = compute({
        posicoes: [
          posicao({ posicao: 'aprovar', votosByDeputado: votos('sim') }),
        ],
        deputados: [
          deputado({
            externalIdDeputado: 204554,
            nome: 'Deputada Exemplo',
            partido: 'PSOL',
            siglaUf: 'PE',
            urlFoto: 'https://foto/exemplo.jpg',
          }),
        ],
      });

      // Assert
      expect(result.deputados[0]).toEqual({
        externalIdDeputado: 204554,
        nome: 'Deputada Exemplo',
        partido: 'PSOL',
        siglaUf: 'PE',
        urlFoto: 'https://foto/exemplo.jpg',
        compatibilidadeBruta: 100,
        amostraComparavel: 1,
        scoreOrdenacaoPercentual: 20.65,
        alertas: [],
        emAtividade: true,
        coberturaExercicio: 1,
      });
      expect(result.totalDeputadosAvaliados).toBe(1);
    });
  });

  describe('when ranking a deputado by the Wilson lower bound', () => {
    it('exposes scoreOrdenacaoPercentual within 0..100', () => {
      // Act
      const result = compute({
        posicoes: [
          posicao({
            externalIdProposicao: 1,
            posicao: 'aprovar',
            votosByDeputado: votos('sim'),
          }),
          posicao({
            externalIdProposicao: 2,
            posicao: 'aprovar',
            votosByDeputado: votos('sim'),
          }),
        ],
        deputados: [deputado()],
      });

      // Assert
      const score = result.deputados[0]?.scoreOrdenacaoPercentual ?? -1;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeLessThan(
        result.deputados[0]?.compatibilidadeBruta ?? 0,
      );
    });
  });

  describe('when the comparable sample is small relative to the computable positions', () => {
    function withSample(
      amostraComparavel: number,
      totalPosicoesComputaveis: number,
    ): ReturnType<typeof computeCompatibilidadeResumida> {
      // posições que entram no denominador via voto 'sim'
      const computaveis = Array.from(
        { length: amostraComparavel },
        (_unused, index) =>
          posicao({
            externalIdProposicao: index + 1,
            posicao: 'aprovar',
            votosByDeputado: votos('sim'),
          }),
      );
      // posições fora do exercício não entram na amostra
      const foraDeExercicio = Array.from(
        { length: totalPosicoesComputaveis - amostraComparavel },
        (_unused, index) =>
          posicao({
            externalIdProposicao: 100 + index,
            posicao: 'aprovar',
            votacaoReferencia: {
              dataHoraRegistro: '2022-01-01T15:00:00Z',
              data: '2022-01-01',
            },
            votosByDeputado: new Map(),
          }),
      );
      return compute({
        posicoes: [...computaveis, ...foraDeExercicio],
        deputados: [deputado()],
        totalPosicoesComputaveis,
      });
    }

    it('emits amostra_pequena strictly below 50% of the computable positions', () => {
      // Arrange: 4 computable positions -> threshold is below 2
      // Act / Assert
      expect(withSample(1, 4).deputados[0]?.alertas).toEqual([
        'amostra_pequena',
      ]);
      expect(withSample(2, 4).deputados[0]?.alertas).toEqual([]);
    });
  });

  describe('when reporting whether the deputado is still active', () => {
    it('is true when the latest interval is open and false when it is closed', () => {
      // Arrange
      const saida: EventoExercicio = {
        dataHora: '2023-09-01T12:00:00Z',
        situacao: 'Fim de Mandato',
        descricaoStatus: 'Saída - Fim de Mandato',
        partido: 'PT',
      };

      // Act
      const ativo = compute({
        posicoes: [
          posicao({ posicao: 'aprovar', votosByDeputado: votos('sim') }),
        ],
        deputados: [deputado({ eventos: [posse] })],
      });
      const inativo = compute({
        posicoes: [
          posicao({ posicao: 'aprovar', votosByDeputado: votos('sim') }),
        ],
        deputados: [deputado({ eventos: [posse, saida] })],
      });

      // Assert
      expect(ativo.deputados[0]?.emAtividade).toBe(true);
      expect(inativo.deputados[0]?.emAtividade).toBe(false);
    });
  });

  describe('when counting reference votacoes covered in exercise', () => {
    it('counts artigo_17 and voto_nao_informado but not fora_de_exercicio', () => {
      // Act
      const result = compute({
        posicoes: [
          // em exercício, no denominador
          posicao({
            externalIdProposicao: 1,
            posicao: 'aprovar',
            votosByDeputado: votos('sim'),
          }),
          // em exercício, fora do denominador por qualidade de dado
          posicao({
            externalIdProposicao: 2,
            posicao: 'aprovar',
            votosByDeputado: votos('artigo_17'),
          }),
          posicao({
            externalIdProposicao: 3,
            posicao: 'aprovar',
            votosByDeputado: votos('nao_informado'),
          }),
          // anterior à posse -> fora_de_exercicio, não conta cobertura
          posicao({
            externalIdProposicao: 4,
            posicao: 'aprovar',
            votacaoReferencia: {
              dataHoraRegistro: '2022-01-01T15:00:00Z',
              data: '2022-01-01',
            },
            votosByDeputado: new Map(),
          }),
        ],
        deputados: [deputado({ eventos: [posse] })],
      });

      // Assert
      expect(result.deputados[0]?.coberturaExercicio).toBe(3);
    });
  });
});
