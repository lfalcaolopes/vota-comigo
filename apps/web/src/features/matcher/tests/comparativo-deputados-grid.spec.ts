import type {
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  MatcherVotoDetalhe,
  PosicaoMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { buildComparativoDeputadosGrid } from "../lib/comparativo-deputados-grid";

function proposicao(externalIdProposicao: number): ProposicaoCard {
  return {
    externalIdProposicao,
    siglaTipo: "PL",
    numero: externalIdProposicao,
    ano: 2024,
    ementa: `Ementa ${externalIdProposicao}`,
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2024-01-01",
    volumeVotacoesPlenario: 1,
    dataUltimaVotacao: "2024-06-01",
  };
}

function deputado(externalIdDeputado: number): MatcherDeputadoResumo {
  return {
    externalIdDeputado,
    nome: `Deputado ${externalIdDeputado}`,
    partido: "PP",
    siglaUf: "SP",
    urlFoto: null,
    emAtividade: true,
    compatibilidadeBruta: 80,
    amostraComparavel: 3,
    scoreOrdenacaoPercentual: 75,
    alertas: [],
  };
}

function voto(
  externalIdProposicao: number,
  overrides: Partial<MatcherVotoDetalhe> = {},
): MatcherVotoDetalhe {
  return {
    proposicao: proposicao(externalIdProposicao),
    posicaoUsuario: "aprovar",
    votacaoReferencia: {
      externalIdVotacao: `votacao-${externalIdProposicao}`,
      data: "2024-06-01",
      descricao: `Votação ${externalIdProposicao}`,
      pattern: "projeto_de_lei",
      votosSim: 300,
      votosNao: 100,
      votosOutros: 5,
      resultado: "aprovada",
    },
    situacaoDeputadoVotacao: "sim",
    matcherEffect: "concordancia",
    ...overrides,
  };
}

function detalhe(
  externalIdDeputado: number,
  votos: MatcherVotoDetalhe[],
): MatcherDeputadoDetalhe {
  return {
    siglaUf: "SP",
    cidade: null,
    totalProposicoesSelecionadas: 3,
    totalPosicoesComputaveis: 3,
    deputado: {
      externalIdDeputado,
      nome: `Deputado ${externalIdDeputado}`,
      partido: "PP",
      siglaUf: "SP",
      urlFoto: null,
      emAtividade: true,
    },
    metrics: {
      totalConcordancias: 2,
      totalDiscordancias: 1,
      totalForaDoDenominador: 0,
      amostraComparavel: 3,
      coberturaExercicio: 3,
      compatibilidadeBruta: 66.7,
      scoreOrdenacaoPercentual: 70,
      alertas: [],
    },
    votos,
  };
}

describe("buildComparativoDeputadosGrid", () => {
  describe("when detalhes arrive in a different order from the selection", () => {
    it("preserves selected deputados and computable proposicoes order", () => {
      // Arrange
      const selectedDeputados = [deputado(20), deputado(10)];
      const posicoes: PosicaoMatcher[] = [
        { externalIdProposicao: 3, posicao: "aprovar" },
        { externalIdProposicao: 1, posicao: "rejeitar" },
        { externalIdProposicao: 2, posicao: "nao_sei" },
      ];
      const detalhes = [
        detalhe(10, [voto(1), voto(3)]),
        detalhe(20, [voto(1), voto(3)]),
      ];

      // Act
      const grid = buildComparativoDeputadosGrid({
        selectedDeputados,
        detalhes,
        posicoes,
      });

      // Assert
      expect(
        grid.columns.map((column) => column.deputado.externalIdDeputado),
      ).toEqual([20, 10]);
      expect(
        grid.rows.map((row) => row.proposicao.externalIdProposicao),
      ).toEqual([3, 1]);
    });
  });

  describe("when votos have different matcher effects", () => {
    it("preserves the real vote, effect and display labels for each deputado cell", () => {
      // Arrange
      const selectedDeputados = [deputado(20), deputado(10), deputado(30)];
      const posicoes: PosicaoMatcher[] = [
        { externalIdProposicao: 1, posicao: "aprovar" },
      ];
      const detalhes = [
        detalhe(10, [
          voto(1, {
            situacaoDeputadoVotacao: "nao",
            matcherEffect: "discordancia",
          }),
        ]),
        detalhe(30, [
          voto(1, {
            situacaoDeputadoVotacao: "fora_de_exercicio",
            matcherEffect: "fora_do_denominador",
          }),
        ]),
        detalhe(20, [
          voto(1, {
            situacaoDeputadoVotacao: "sim",
            matcherEffect: "concordancia",
          }),
        ]),
      ];

      // Act
      const grid = buildComparativoDeputadosGrid({
        selectedDeputados,
        detalhes,
        posicoes,
      });

      // Assert
      expect(grid.rows[0].cells).toEqual([
        expect.objectContaining({
          externalIdDeputado: 20,
          situacaoDeputadoVotacao: "sim",
          matcherEffect: "concordancia",
          situacaoLabel: "Sim",
          matcherEffectVerdict: { label: "Alinhado", tone: "success" },
        }),
        expect.objectContaining({
          externalIdDeputado: 10,
          situacaoDeputadoVotacao: "nao",
          matcherEffect: "discordancia",
          situacaoLabel: "Não",
          matcherEffectVerdict: { label: "Divergente", tone: "danger" },
        }),
        expect.objectContaining({
          externalIdDeputado: 30,
          situacaoDeputadoVotacao: "fora_de_exercicio",
          matcherEffect: "fora_do_denominador",
          situacaoLabel: "Fora de exercício",
          matcherEffectVerdict: { label: "Fora do cálculo", tone: "neutral" },
        }),
      ]);
    });
  });
});
