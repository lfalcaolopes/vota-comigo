import type {
  DeputadoPerfil,
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  MatcherVotoDetalhe,
  PosicaoMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { StepComparativo } from "../components/comparativo/step-comparativo";

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

function perfil(
  externalIdDeputado: number,
  overrides: Partial<DeputadoPerfil> = {},
): DeputadoPerfil {
  const base: DeputadoPerfil = {
    externalIdDeputado,
    nomePublico: `Deputado ${externalIdDeputado}`,
    nomeCivil: `Nome Civil ${externalIdDeputado}`,
    fonteOficial: `https://www.camara.leg.br/deputados/${externalIdDeputado}`,
    historicoParlamentarDisponivel: true,
    snapshotPublicoDisponivel: true,
    snapshotPublico: {
      nomeEleitoral: `Deputado ${externalIdDeputado}`,
      siglaPartido: "PP",
      siglaUf: "SP",
      urlFoto: null,
    },
    emAtividade: true,
    redesSociais: ["https://example.com/rede-social"],
    dataNascimento: "1980-01-01",
    municipioNascimento: "Santos",
    ufNascimento: "SP",
    externalIdLegislaturaInicial: 56,
    externalIdLegislaturaFinal: null,
    resumoPresencaDisponivel: true,
    resumoPresenca: {
      percentualPresenca: 82.4,
      presencas: 103,
      totalVotacoesEmExercicio: 125,
      ausenciasSemMotivoConhecido: 22,
    },
    historicoPartidarioDisponivel: true,
    historicoPartidario: [
      {
        siglaPartido: "PP",
        dataInicio: "2023-02-01",
        dataFim: null,
        atual: true,
      },
    ],
  };

  return { ...base, ...overrides };
}

function render(props: {
  deputados?: MatcherDeputadoResumo[];
  detalhes?: MatcherDeputadoDetalhe[];
  perfis?: DeputadoPerfil[];
  posicoes?: PosicaoMatcher[];
  status?: "idle" | "loading" | "error";
}): string {
  return renderToStaticMarkup(
    createElement(StepComparativo, {
      deputados: props.deputados ?? [deputado(20), deputado(10)],
      detalhes: props.detalhes ?? [],
      perfis: props.perfis ?? [perfil(20), perfil(10)],
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
      expect(html).toContain("Você");
      expect(html).toContain("Sim");
      expect(html).toContain("Alinhado");
      expect(html).toContain("Não");
      expect(html).toContain("Divergente");
      expect(html).toContain("PL 2/2024");
      expect(html).toContain("Abstenção");
      expect(html).toContain("Fora de exercício");
      expect(html).toContain("Fora do cálculo");
      expect(html).not.toContain("Sua posição");
      expect(html).not.toContain("A favor da aprovação");
      expect(html).not.toContain("Contra a aprovação");
      expect(html).not.toContain("Votação");
      expect(html).not.toContain("1 jun 2024");
      expect(html).not.toContain("Placar");
      expect(html).not.toContain("300 sim");
      expect(html).not.toContain("Votação 1");
    });

    it("shows deputado headers from perfil with profile links opening in a new tab", () => {
      // Arrange / Act
      const html = render({
        status: "idle",
        deputados: [deputado(20), deputado(10)],
        detalhes: [detalhe(20, [voto(1)]), detalhe(10, [voto(1)])],
        perfis: [perfil(20), perfil(10)],
      });

      // Assert
      expect(html).toContain("Deputado 20");
      expect(html).toContain("PP · SP");
      expect(html).toContain("Em atividade");
      expect(html).toContain('href="/deputados/20"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    it("keeps the label column sticky so the reading anchor stays visible while scrolling horizontally", () => {
      // Arrange / Act
      const html = render({
        status: "idle",
        deputados: [deputado(20), deputado(10)],
        detalhes: [detalhe(20, [voto(1)]), detalhe(10, [voto(1)])],
      });

      // Assert
      expect(html).toContain("sticky left-0");
    });

    it("keeps deputado names recognizable on narrow columns instead of truncating them", () => {
      // Arrange / Act
      const html = render({
        status: "idle",
        deputados: [deputado(20), deputado(10)],
        detalhes: [detalhe(20, [voto(1)]), detalhe(10, [voto(1)])],
      });

      // Assert
      expect(html).toContain("line-clamp-2");
      expect(html).not.toContain("block truncate");
    });

    it("guides small viewport users to scroll horizontally to reach every deputado", () => {
      // Arrange / Act
      const html = render({
        status: "idle",
        deputados: [deputado(20), deputado(10)],
        detalhes: [detalhe(20, [voto(1)]), detalhe(10, [voto(1)])],
      });

      // Assert
      expect(html).toContain('role="status"');
      expect(html).toContain("Role na horizontal para ver todos os deputados.");
    });

    it("shows resumo de presença from perfil without rendering profile details outside the comparativo scope", () => {
      // Arrange / Act
      const html = render({
        status: "idle",
        deputados: [deputado(20), deputado(10)],
        detalhes: [detalhe(20, [voto(1)]), detalhe(10, [voto(1)])],
        perfis: [
          perfil(20),
          perfil(10, {
            resumoPresencaDisponivel: false,
            resumoPresenca: null,
          }),
        ],
      });

      // Assert
      expect(html).toContain("Presença");
      expect(html).toContain("82%");
      expect(html).toContain("103 de 125 votações em exercício");
      expect(html).toContain("22 ausências sem motivo conhecido");
      expect(html).toContain("votações nominais de plenário presentes na base");
      expect(html).toContain("Presença indisponível");
      expect(html).not.toContain("Nome Civil 20");
      expect(html).not.toContain("rede-social");
      expect(html).not.toContain("Nascimento");
      expect(html).not.toContain("Legislatura");
      expect(html).not.toContain("Fonte oficial");
      expect(html).not.toContain("Compatibilidade");
      expect(html).not.toContain("Score Wilson");
      expect(html).not.toContain("Amostra comparável");
      expect(html).not.toContain("0%");
    });
  });
});
