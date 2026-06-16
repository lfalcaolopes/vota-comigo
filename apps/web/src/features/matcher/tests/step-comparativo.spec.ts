import type {
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  MatcherVotoDetalhe,
  PosicaoMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { StepComparativo } from "../components/step-comparativo";

function proposicao(externalIdProposicao: number): ProposicaoCard {
  return {
    externalIdProposicao,
    siglaTipo: "PL",
    numero: externalIdProposicao,
    ano: 2024,
    ementa: `Ementa ${externalIdProposicao}`,
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

function render(props: {
  deputados?: MatcherDeputadoResumo[];
  detalhes?: MatcherDeputadoDetalhe[];
  posicoes?: PosicaoMatcher[];
  status?: "idle" | "loading" | "error";
}): string {
  return renderToStaticMarkup(
    createElement(StepComparativo, {
      deputados: props.deputados ?? [deputado(20), deputado(10)],
      detalhes: props.detalhes ?? [],
      posicoes:
        props.posicoes ?? [
          { externalIdProposicao: 1, posicao: "aprovar" },
          { externalIdProposicao: 2, posicao: "rejeitar" },
        ],
      status: props.status ?? "idle",
      onBack: vi.fn(),
      onRetry: vi.fn(),
    }),
  );
}

describe("StepComparativo", () => {
  describe("when comparativo detalhes are loading", () => {
    it("shows the back action and skeleton without rendering deputado columns", () => {
      // Arrange / Act
      const html = render({ status: "loading" });

      // Assert
      expect(html).toContain("Voltar ao resultado");
      expect(html).toContain("Carregando conteúdo");
      expect(html).not.toContain("Deputado 20");
      expect(html).not.toContain("Deputado 10");
    });
  });

  describe("when comparativo detalhes fail to load", () => {
    it("shows a global retry action without rendering deputado columns", () => {
      // Arrange / Act
      const html = render({
        status: "error",
        detalhes: [detalhe(20, [voto(1)])],
      });

      // Assert
      expect(html).toContain("Voltar ao resultado");
      expect(html).toContain("Erro ao carregar");
      expect(html).toContain("Não foi possível carregar o comparativo");
      expect(html).toContain("Tentar novamente");
      expect(html).not.toContain("Deputado 20");
      expect(html).not.toContain("Sim");
    });
  });

  describe("when comparativo detalhes are loaded", () => {
    it("shows proposicao rows with user position and vote cells", () => {
      // Arrange / Act
      const html = render({
        status: "idle",
        deputados: [deputado(20), deputado(10)],
        posicoes: [
          { externalIdProposicao: 1, posicao: "aprovar" },
          { externalIdProposicao: 2, posicao: "rejeitar" },
        ],
        detalhes: [
          detalhe(10, [
            voto(1, {
              situacaoDeputadoVotacao: "nao",
              matcherEffect: "discordancia",
            }),
            voto(2, {
              situacaoDeputadoVotacao: "fora_de_exercicio",
              matcherEffect: "fora_do_denominador",
            }),
          ]),
          detalhe(20, [
            voto(1, {
              situacaoDeputadoVotacao: "sim",
              matcherEffect: "concordancia",
            }),
            voto(2, {
              situacaoDeputadoVotacao: "abstencao",
              matcherEffect: "discordancia",
            }),
          ]),
        ],
      });

      // Assert
      expect(html.indexOf("Deputado 20")).toBeLessThan(
        html.indexOf("Deputado 10"),
      );
      expect(html).toContain("PL 1/2024");
      expect(html).toContain("Ementa 1");
      expect(html).toContain("A favor da aprovação");
      expect(html).toContain("Sim");
      expect(html).toContain("Alinhado");
      expect(html).toContain("Não");
      expect(html).toContain("Divergente");
      expect(html).toContain("PL 2/2024");
      expect(html).toContain("Contra a aprovação");
      expect(html).toContain("Abstenção");
      expect(html).toContain("Fora de exercício");
      expect(html).toContain("Fora do cálculo");
      expect(html).not.toContain("Votação");
      expect(html).not.toContain("1 jun 2024");
      expect(html).not.toContain("Placar");
      expect(html).not.toContain("300 sim");
      expect(html).not.toContain("Votação 1");
    });
  });
});
