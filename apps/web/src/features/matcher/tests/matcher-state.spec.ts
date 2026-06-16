import type {
  DeputadoPerfil,
  EscopoMatcher,
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  MatcherResultado,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  activeResultado,
  canRunMatcher,
  canOpenComparativo,
  hasMoreDeputados,
  hasComparativoDeputadoLimit,
  initMatcherState,
  isComparativoSelectionMode,
  isDetalheOpen,
  isSemBomMatch,
  matcherReducer,
  resultadoDisplay,
  selectionCount,
  stepStatus,
} from "../lib/matcher-state";

function card(externalIdProposicao: number): ProposicaoCard {
  return {
    externalIdProposicao,
    siglaTipo: "PL",
    numero: externalIdProposicao,
    ano: 2023,
    ementa: "Dispõe sobre alguma coisa.",
    dataApresentacao: "2023-05-10",
    volumeVotacoesPlenario: 9,
    dataUltimaVotacao: "2025-03-14",
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
    amostraComparavel: 10,
    scoreOrdenacaoPercentual: 80,
    alertas: [],
  };
}

function resultado(escopo: EscopoMatcher, overrides: Partial<MatcherResultado> = {}): MatcherResultado {
  return {
    siglaUf: "SP",
    cidade: null,
    totalProposicoesSelecionadas: 3,
    totalPosicoesComputaveis: 3,
    escopo,
    deputados: [],
    totalDeputadosAvaliados: 0,
    deputadosHistoricoIncompleto: 0,
    total: 0,
    limit: 20,
    offset: 0,
    semBomMatch: false,
    ...overrides,
  };
}

const candidates = [card(1), card(2), card(3), card(4), card(5), card(6)];

describe("matcherReducer", () => {
  describe("when initialised with candidate proposicoes", () => {
    it("starts at the local step with the first five pre-selected", () => {
      // Arrange / Act
      const state = initMatcherState(candidates);

      // Assert
      expect(state.step).toBe("local");
      expect(state.siglaUf).toBeNull();
      expect(state.escopo).toBe("estadual");
      expect(state.status).toBe("idle");
      expect(selectionCount(state)).toBe(5);
      expect(state.selected.map((c) => c.externalIdProposicao)).toEqual([
        1, 2, 3, 4, 5,
      ]);
    });
  });

  describe("when recording the location", () => {
    it("stores the chosen UF and cidade without changing the step", () => {
      // Arrange
      const state = initMatcherState(candidates);

      // Act
      const next = matcherReducer(state, {
        type: "setLocal",
        siglaUf: "SP",
        cidade: "Santos",
      });

      // Assert
      expect(next.siglaUf).toBe("SP");
      expect(next.cidade).toBe("Santos");
      expect(next.step).toBe("local");
    });
  });

  describe("when toggling a proposicao", () => {
    it("removes an already-selected proposicao and its declared position", () => {
      // Arrange
      const withPosicao = matcherReducer(initMatcherState(candidates), {
        type: "setPosicao",
        externalIdProposicao: 1,
        posicao: "aprovar",
      });

      // Act
      const next = matcherReducer(withPosicao, {
        type: "toggleProposicao",
        proposicao: card(1),
      });

      // Assert
      expect(
        next.selected.some((c) => c.externalIdProposicao === 1),
      ).toBe(false);
      expect(next.posicoes.has(1)).toBe(false);
    });

    it("adds a not-yet-selected proposicao", () => {
      // Arrange
      const state = initMatcherState(candidates);

      // Act
      const next = matcherReducer(state, {
        type: "toggleProposicao",
        proposicao: card(6),
      });

      // Assert
      expect(next.selected.some((c) => c.externalIdProposicao === 6)).toBe(true);
      expect(selectionCount(next)).toBe(6);
    });

    it("refuses to add beyond the maximum of selected proposicoes", () => {
      // Arrange
      const many = Array.from({ length: 30 }, (_, i) => card(i + 1));
      let state = initMatcherState([]);
      for (const proposicao of many) {
        state = matcherReducer(state, { type: "toggleProposicao", proposicao });
      }

      // Act
      const next = matcherReducer(state, {
        type: "toggleProposicao",
        proposicao: card(31),
      });

      // Assert
      expect(selectionCount(next)).toBe(30);
      expect(next.selected.some((c) => c.externalIdProposicao === 31)).toBe(
        false,
      );
    });
  });

  describe("when navigating back to an earlier step", () => {
    it("preserves the UF, selection and declared positions", () => {
      // Arrange
      let state = initMatcherState(candidates);
      state = matcherReducer(state, {
        type: "setLocal",
        siglaUf: "MG",
        cidade: "",
      });
      state = matcherReducer(state, {
        type: "setPosicao",
        externalIdProposicao: 2,
        posicao: "rejeitar",
      });
      state = matcherReducer(state, { type: "goToStep", step: "posicoes" });

      // Act
      const back = matcherReducer(state, { type: "goToStep", step: "selecao" });

      // Assert
      expect(back.step).toBe("selecao");
      expect(back.siglaUf).toBe("MG");
      expect(selectionCount(back)).toBe(5);
      expect(back.posicoes.get(2)).toBe("rejeitar");
    });
  });

  describe("when running the matcher", () => {
    const resultado = {
      siglaUf: "SP" as const,
      cidade: null,
      totalProposicoesSelecionadas: 3,
      totalPosicoesComputaveis: 3,
      escopo: "estadual" as const,
      deputados: [],
      totalDeputadosAvaliados: 0,
      deputadosHistoricoIncompleto: 0,
      total: 0,
      limit: 20,
      offset: 0,
      semBomMatch: false,
    };

    it("moves to loading on start", () => {
      // Arrange
      const state = initMatcherState(candidates);

      // Act
      const next = matcherReducer(state, { type: "runStart" });

      // Assert
      expect(next.status).toBe("loading");
    });

    it("caches the result by escopo and lands on the resultado step", () => {
      // Arrange
      const loading = matcherReducer(initMatcherState(candidates), {
        type: "runStart",
      });

      // Act
      const next = matcherReducer(loading, {
        type: "runOk",
        escopo: "estadual",
        resultado,
      });

      // Assert
      expect(next.step).toBe("resultado");
      expect(next.status).toBe("idle");
      expect(next.resultados.estadual).toEqual(resultado);
    });

    it("moves to error when the execution fails", () => {
      // Arrange
      const loading = matcherReducer(initMatcherState(candidates), {
        type: "runStart",
      });

      // Act
      const next = matcherReducer(loading, { type: "runError" });

      // Assert
      expect(next.status).toBe("error");
    });
  });

  describe("step indicator navigation", () => {
    it("returns 'done' for steps before the current one", () => {
      // Arrange / Act / Assert
      expect(stepStatus("selecao", "local")).toBe("done");
      expect(stepStatus("posicoes", "local")).toBe("done");
      expect(stepStatus("posicoes", "selecao")).toBe("done");
      expect(stepStatus("resultado", "local")).toBe("done");
      expect(stepStatus("resultado", "selecao")).toBe("done");
      expect(stepStatus("resultado", "posicoes")).toBe("done");
    });

    it("returns 'current' for the active step", () => {
      // Arrange / Act / Assert
      expect(stepStatus("local", "local")).toBe("current");
      expect(stepStatus("selecao", "selecao")).toBe("current");
      expect(stepStatus("posicoes", "posicoes")).toBe("current");
      expect(stepStatus("resultado", "resultado")).toBe("current");
    });

    it("returns 'upcoming' for steps after the current one", () => {
      // Arrange / Act / Assert
      expect(stepStatus("local", "selecao")).toBe("upcoming");
      expect(stepStatus("local", "posicoes")).toBe("upcoming");
      expect(stepStatus("local", "resultado")).toBe("upcoming");
      expect(stepStatus("selecao", "posicoes")).toBe("upcoming");
      expect(stepStatus("selecao", "resultado")).toBe("upcoming");
      expect(stepStatus("posicoes", "resultado")).toBe("upcoming");
    });

    it("works at the extremes: 'local' has no done steps, 'resultado' has no upcoming steps", () => {
      // Arrange / Act / Assert
      expect(stepStatus("local", "selecao")).toBe("upcoming");
      expect(stepStatus("local", "posicoes")).toBe("upcoming");
      expect(stepStatus("local", "resultado")).toBe("upcoming");
      expect(stepStatus("resultado", "local")).toBe("done");
      expect(stepStatus("resultado", "selecao")).toBe("done");
      expect(stepStatus("resultado", "posicoes")).toBe("done");
    });
  });

  describe("setEscopo", () => {
    it("flips the active escopo without touching selected or posicoes", () => {
      // Arrange
      let state = initMatcherState(candidates);
      state = matcherReducer(state, { type: "setLocal", siglaUf: "SP", cidade: "" });
      state = matcherReducer(state, {
        type: "setPosicao",
        externalIdProposicao: 1,
        posicao: "aprovar",
      });

      // Act
      const next = matcherReducer(state, { type: "setEscopo", escopo: "nacional" });

      // Assert
      expect(next.escopo).toBe("nacional");
      expect(next.selected).toEqual(state.selected);
      expect(next.posicoes).toEqual(state.posicoes);
    });

    it("returns the cached resultado for the new escopo when present", () => {
      // Arrange
      let state = initMatcherState(candidates);
      const estadualResultado = resultado("estadual", { deputados: [deputado(1)], total: 1 });
      const nacionalResultado = resultado("nacional", { deputados: [deputado(2)], total: 1 });
      state = matcherReducer(state, { type: "runOk", escopo: "estadual", resultado: estadualResultado });
      state = matcherReducer(state, { type: "runOk", escopo: "nacional", resultado: nacionalResultado });

      // Act
      const next = matcherReducer(state, { type: "setEscopo", escopo: "estadual" });

      // Assert
      expect(next.escopo).toBe("estadual");
      expect(activeResultado(next)).toEqual(estadualResultado);
    });

    it("returns null for the new escopo when not yet cached", () => {
      // Arrange
      let state = initMatcherState(candidates);
      const estadualResultado = resultado("estadual", { deputados: [deputado(1)], total: 1 });
      state = matcherReducer(state, { type: "runOk", escopo: "estadual", resultado: estadualResultado });

      // Act
      const next = matcherReducer(state, { type: "setEscopo", escopo: "nacional" });

      // Assert
      expect(next.escopo).toBe("nacional");
      expect(activeResultado(next)).toBeNull();
    });
  });

  describe("loadMoreOk", () => {
    it("appends deputados to the active scope and preserves total", () => {
      // Arrange
      const page1 = resultado("estadual", { deputados: [deputado(1), deputado(2)], total: 5 });
      const state = matcherReducer(initMatcherState(candidates), {
        type: "runOk",
        escopo: "estadual",
        resultado: page1,
      });

      const page2 = resultado("estadual", { deputados: [deputado(3), deputado(4)], total: 5, offset: 2 });

      // Act
      const next = matcherReducer(state, { type: "loadMoreOk", escopo: "estadual", resultado: page2 });

      // Assert
      const active = activeResultado(next)!;
      expect(active.deputados.map((d) => d.externalIdDeputado)).toEqual([1, 2, 3, 4]);
      expect(active.total).toBe(5);
    });

    it("leaves the other scope's cache untouched", () => {
      // Arrange
      const estadualResultado = resultado("estadual", { deputados: [deputado(1)], total: 2 });
      const nacionalResultado = resultado("nacional", { deputados: [deputado(10)], total: 2 });
      let state = matcherReducer(initMatcherState(candidates), {
        type: "runOk",
        escopo: "estadual",
        resultado: estadualResultado,
      });
      state = matcherReducer(state, { type: "runOk", escopo: "nacional", resultado: nacionalResultado });
      state = matcherReducer(state, { type: "setEscopo", escopo: "estadual" });

      const morePage = resultado("estadual", { deputados: [deputado(2)], total: 2, offset: 1 });

      // Act
      const next = matcherReducer(state, { type: "loadMoreOk", escopo: "estadual", resultado: morePage });

      // Assert
      expect(next.resultados.nacional!.deputados.map((d) => d.externalIdDeputado)).toEqual([10]);
    });

    it("is a no-op when the scope slot is null", () => {
      // Arrange
      const state = initMatcherState(candidates);
      const page = resultado("estadual", { deputados: [deputado(1)], total: 1 });

      // Act
      const next = matcherReducer(state, { type: "loadMoreOk", escopo: "estadual", resultado: page });

      // Assert
      expect(next.resultados.estadual).toBeNull();
    });
  });

  describe("hasMoreDeputados", () => {
    it("is true when deputados.length is less than total", () => {
      // Arrange
      const state = matcherReducer(initMatcherState(candidates), {
        type: "runOk",
        escopo: "estadual",
        resultado: resultado("estadual", { deputados: [deputado(1), deputado(2)], total: 5 }),
      });

      // Act / Assert
      expect(hasMoreDeputados(state)).toBe(true);
    });

    it("is false when deputados.length equals total", () => {
      // Arrange
      const state = matcherReducer(initMatcherState(candidates), {
        type: "runOk",
        escopo: "estadual",
        resultado: resultado("estadual", { deputados: [deputado(1)], total: 1 }),
      });

      // Act / Assert
      expect(hasMoreDeputados(state)).toBe(false);
    });

    it("is false when there is no active resultado", () => {
      // Arrange
      const state = initMatcherState(candidates);

      // Act / Assert
      expect(hasMoreDeputados(state)).toBe(false);
    });
  });

  describe("resultadoDisplay", () => {
    describe("when loading and no resultado cached", () => {
      it("returns 'loading'", () => {
        // Arrange
        const state = matcherReducer(initMatcherState(candidates), { type: "runStart" });

        // Act / Assert
        expect(resultadoDisplay(state)).toBe("loading");
      });
    });

    describe("when error and no resultado cached", () => {
      it("returns 'error'", () => {
        // Arrange
        const loading = matcherReducer(initMatcherState(candidates), { type: "runStart" });
        const state = matcherReducer(loading, { type: "runError" });

        // Act / Assert
        expect(resultadoDisplay(state)).toBe("error");
      });
    });

    describe("when resultado has no deputados", () => {
      it("returns 'empty'", () => {
        // Arrange
        const state = matcherReducer(initMatcherState(candidates), {
          type: "runOk",
          escopo: "estadual",
          resultado: resultado("estadual", { deputados: [], total: 0 }),
        });

        // Act / Assert
        expect(resultadoDisplay(state)).toBe("empty");
      });
    });

    describe("when resultado is null for the active escopo", () => {
      it("returns 'empty'", () => {
        // Arrange
        const estadualResultado = resultado("estadual", { deputados: [deputado(1)], total: 1 });
        let state = matcherReducer(initMatcherState(candidates), {
          type: "runOk",
          escopo: "estadual",
          resultado: estadualResultado,
        });
        state = matcherReducer(state, { type: "setEscopo", escopo: "nacional" });

        // Act / Assert
        expect(resultadoDisplay(state)).toBe("empty");
      });
    });

    describe("when resultado has deputados", () => {
      it("returns 'results'", () => {
        // Arrange
        const state = matcherReducer(initMatcherState(candidates), {
          type: "runOk",
          escopo: "estadual",
          resultado: resultado("estadual", { deputados: [deputado(1)], total: 1 }),
        });

        // Act / Assert
        expect(resultadoDisplay(state)).toBe("results");
      });

      it("returns 'results' even while loading more", () => {
        // Arrange
        let state = matcherReducer(initMatcherState(candidates), {
          type: "runOk",
          escopo: "estadual",
          resultado: resultado("estadual", { deputados: [deputado(1)], total: 2 }),
        });
        state = matcherReducer(state, { type: "runStart" });

        // Act / Assert
        expect(resultadoDisplay(state)).toBe("results");
      });
    });
  });

  describe("isSemBomMatch", () => {
    describe("when resultado is null", () => {
      it("returns false", () => {
        // Act / Assert
        expect(isSemBomMatch(null)).toBe(false);
      });
    });

    describe("when semBomMatch is false", () => {
      it("returns false", () => {
        // Arrange
        const r = resultado("estadual", { semBomMatch: false });

        // Act / Assert
        expect(isSemBomMatch(r)).toBe(false);
      });
    });

    describe("when semBomMatch is true", () => {
      it("returns true", () => {
        // Arrange
        const r = resultado("estadual", { semBomMatch: true });

        // Act / Assert
        expect(isSemBomMatch(r)).toBe(true);
      });
    });
  });

  describe("detalhe lifecycle", () => {
    function makeDetalhe(externalIdDeputado: number): MatcherDeputadoDetalhe {
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
        votos: [],
      };
    }

    describe("openDetalheStart", () => {
      it("sets detalheStatus to loading and records the deputado id", () => {
        // Arrange
        const state = initMatcherState(candidates);

        // Act
        const next = matcherReducer(state, {
          type: "openDetalheStart",
          externalIdDeputado: 99,
        });

        // Assert
        expect(next.detalheStatus).toBe("loading");
        expect(next.detalheDeputadoId).toBe(99);
        expect(next.detalhe).toBeNull();
      });
    });

    describe("openDetalheOk", () => {
      it("stores the detalhe and resets status to idle", () => {
        // Arrange
        const loading = matcherReducer(initMatcherState(candidates), {
          type: "openDetalheStart",
          externalIdDeputado: 42,
        });
        const detalhe = makeDetalhe(42);

        // Act
        const next = matcherReducer(loading, {
          type: "openDetalheOk",
          detalhe,
        });

        // Assert
        expect(next.detalheStatus).toBe("idle");
        expect(next.detalhe).toEqual(detalhe);
      });
    });

    describe("openDetalheError", () => {
      it("sets detalheStatus to error", () => {
        // Arrange
        const loading = matcherReducer(initMatcherState(candidates), {
          type: "openDetalheStart",
          externalIdDeputado: 42,
        });

        // Act
        const next = matcherReducer(loading, { type: "openDetalheError" });

        // Assert
        expect(next.detalheStatus).toBe("error");
      });
    });

    describe("closeDetalhe", () => {
      it("resets detalhe fields without touching resultados", () => {
        // Arrange
        const withResultado = matcherReducer(initMatcherState(candidates), {
          type: "runOk",
          escopo: "estadual",
          resultado: resultado("estadual", {
            deputados: [deputado(1)],
            total: 1,
          }),
        });
        const withDetalhe = matcherReducer(withResultado, {
          type: "openDetalheOk",
          detalhe: makeDetalhe(1),
        });

        // Act
        const next = matcherReducer(withDetalhe, { type: "closeDetalhe" });

        // Assert
        expect(next.detalhe).toBeNull();
        expect(next.detalheDeputadoId).toBeNull();
        expect(next.detalheStatus).toBe("idle");
        expect(next.resultados.estadual).not.toBeNull();
      });
    });
  });

  describe("comparativo selection lifecycle", () => {
    function makeDetalhe(externalIdDeputado: number): MatcherDeputadoDetalhe {
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
        votos: [],
      };
    }

    function makePerfil(externalIdDeputado: number): DeputadoPerfil {
      return {
        externalIdDeputado,
        nomePublico: `Deputado ${externalIdDeputado}`,
        nomeCivil: null,
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
        redesSociais: [],
        dataNascimento: null,
        municipioNascimento: null,
        ufNascimento: null,
        externalIdLegislaturaInicial: null,
        externalIdLegislaturaFinal: null,
        resumoPresencaDisponivel: false,
        resumoPresenca: null,
        historicoPartidarioDisponivel: false,
        historicoPartidario: [],
      };
    }

    it("starts resultado in normal mode without selected deputados", () => {
      // Arrange / Act
      const state = initMatcherState(candidates);

      // Assert
      expect(isComparativoSelectionMode(state)).toBe(false);
      expect(state.selectedComparativoDeputados).toEqual([]);
      expect(state.comparativoStatus).toBe("idle");
      expect(state.comparativoDetalhes).toEqual([]);
      expect(state.comparativoPerfis).toEqual([]);
      expect(canOpenComparativo(state)).toBe(false);
    });

    it("enters selection mode without changing the active resultado", () => {
      // Arrange
      const r = resultado("estadual", { deputados: [deputado(1), deputado(2)], total: 2 });
      const state = matcherReducer(initMatcherState(candidates), {
        type: "runOk",
        escopo: "estadual",
        resultado: r,
      });

      // Act
      const next = matcherReducer(state, { type: "startComparativoSelection" });

      // Assert
      expect(isComparativoSelectionMode(next)).toBe(true);
      expect(activeResultado(next)).toEqual(r);
      expect(next.selectedComparativoDeputados).toEqual([]);
    });

    it("selects and deselects deputados while preserving the selection order", () => {
      // Arrange
      let state = matcherReducer(initMatcherState(candidates), {
        type: "startComparativoSelection",
      });

      // Act
      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(3),
      });
      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(1),
      });
      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(3),
      });

      // Assert
      expect(
        state.selectedComparativoDeputados.map((d) => d.externalIdDeputado),
      ).toEqual([1]);
    });

    it("allows opening the comparativo only with two or three deputados", () => {
      // Arrange
      let state = matcherReducer(initMatcherState(candidates), {
        type: "startComparativoSelection",
      });

      // Act / Assert
      expect(canOpenComparativo(state)).toBe(false);

      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(1),
      });
      expect(canOpenComparativo(state)).toBe(false);

      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(2),
      });
      expect(canOpenComparativo(state)).toBe(true);

      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(3),
      });
      expect(canOpenComparativo(state)).toBe(true);
    });

    it("blocks selecting more than three deputados", () => {
      // Arrange
      let state = matcherReducer(initMatcherState(candidates), {
        type: "startComparativoSelection",
      });
      for (const id of [1, 2, 3]) {
        state = matcherReducer(state, {
          type: "toggleComparativoDeputado",
          deputado: deputado(id),
        });
      }

      // Act
      const next = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(4),
      });

      // Assert
      expect(hasComparativoDeputadoLimit(next)).toBe(true);
      expect(
        next.selectedComparativoDeputados.map((d) => d.externalIdDeputado),
      ).toEqual([1, 2, 3]);
    });

    it("cancels selection and clears temporary deputados", () => {
      // Arrange
      let state = matcherReducer(initMatcherState(candidates), {
        type: "startComparativoSelection",
      });
      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(1),
      });

      // Act
      const next = matcherReducer(state, { type: "cancelComparativoSelection" });

      // Assert
      expect(isComparativoSelectionMode(next)).toBe(false);
      expect(next.selectedComparativoDeputados).toEqual([]);
      expect(next.step).toBe("local");
    });

    it("starts opening the comparativo with deputados in the order selected", () => {
      // Arrange
      let state = matcherReducer(initMatcherState(candidates), {
        type: "runOk",
        escopo: "estadual",
        resultado: resultado("estadual"),
      });
      state = matcherReducer(state, { type: "startComparativoSelection" });
      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(7),
      });
      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(5),
      });

      // Act
      const next = matcherReducer(state, { type: "openComparativoStart" });

      // Assert
      expect(next.step).toBe("comparativo");
      expect(next.comparativoStatus).toBe("loading");
      expect(next.comparativoDetalhes).toEqual([]);
      expect(next.comparativoPerfis).toEqual([]);
      expect(isComparativoSelectionMode(next)).toBe(false);
      expect(
        next.selectedComparativoDeputados.map((d) => d.externalIdDeputado),
      ).toEqual([7, 5]);
    });

    it("does not open the comparativo with fewer than two deputados", () => {
      // Arrange
      let state = matcherReducer(initMatcherState(candidates), {
        type: "runOk",
        escopo: "estadual",
        resultado: resultado("estadual"),
      });
      state = matcherReducer(state, { type: "startComparativoSelection" });
      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(7),
      });

      // Act
      const next = matcherReducer(state, { type: "openComparativoStart" });

      // Assert
      expect(next.step).toBe("resultado");
      expect(next.comparativoStatus).toBe("idle");
      expect(isComparativoSelectionMode(next)).toBe(true);
    });

    it("stores comparativo detalhes and perfis after loading succeeds", () => {
      // Arrange
      const loading = matcherReducer(initMatcherState(candidates), {
        type: "openComparativoStart",
      });
      const detalhes = [makeDetalhe(7), makeDetalhe(5)];
      const perfis = [makePerfil(7), makePerfil(5)];

      // Act
      const next = matcherReducer(loading, {
        type: "openComparativoOk",
        detalhes,
        perfis,
      });

      // Assert
      expect(next.comparativoStatus).toBe("idle");
      expect(next.comparativoDetalhes).toEqual(detalhes);
      expect(next.comparativoPerfis).toEqual(perfis);
    });

    it("shows a comparativo error without keeping partial detalhes or perfis", () => {
      // Arrange
      const loading = matcherReducer(initMatcherState(candidates), {
        type: "openComparativoStart",
      });

      // Act
      const next = matcherReducer(loading, { type: "openComparativoError" });

      // Assert
      expect(next.comparativoStatus).toBe("error");
      expect(next.comparativoDetalhes).toEqual([]);
      expect(next.comparativoPerfis).toEqual([]);
    });

    it("returns from comparativo to resultado in normal mode", () => {
      // Arrange
      let state = matcherReducer(initMatcherState(candidates), {
        type: "runOk",
        escopo: "estadual",
        resultado: resultado("estadual"),
      });
      state = matcherReducer(state, { type: "startComparativoSelection" });
      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(1),
      });
      state = matcherReducer(state, {
        type: "toggleComparativoDeputado",
        deputado: deputado(2),
      });
      state = matcherReducer(state, { type: "openComparativoStart" });
      state = matcherReducer(state, {
        type: "openComparativoOk",
        detalhes: [makeDetalhe(1), makeDetalhe(2)],
        perfis: [makePerfil(1), makePerfil(2)],
      });

      // Act
      const next = matcherReducer(state, { type: "backFromComparativo" });

      // Assert
      expect(next.step).toBe("resultado");
      expect(isComparativoSelectionMode(next)).toBe(false);
      expect(next.selectedComparativoDeputados).toEqual([]);
      expect(next.comparativoStatus).toBe("idle");
      expect(next.comparativoDetalhes).toEqual([]);
      expect(next.comparativoPerfis).toEqual([]);
    });
  });

  describe("isDetalheOpen", () => {
    it("is false when no detalhe has been opened", () => {
      // Arrange
      const state = initMatcherState(candidates);

      // Act / Assert
      expect(isDetalheOpen(state)).toBe(false);
    });

    it("is true after openDetalheStart", () => {
      // Arrange
      const state = matcherReducer(initMatcherState(candidates), {
        type: "openDetalheStart",
        externalIdDeputado: 5,
      });

      // Act / Assert
      expect(isDetalheOpen(state)).toBe(true);
    });

    it("is false after closeDetalhe", () => {
      // Arrange
      const opened = matcherReducer(initMatcherState(candidates), {
        type: "openDetalheStart",
        externalIdDeputado: 5,
      });
      const closed = matcherReducer(opened, { type: "closeDetalhe" });

      // Act / Assert
      expect(isDetalheOpen(closed)).toBe(false);
    });
  });

  describe("when selected proposicoes are absent from the visible feed items", () => {
    it("selectionCount counts all selected items regardless of what the feed is currently showing", () => {
      // Arrange — 5 proposicoes pre-selected from initial candidates
      const state = initMatcherState(candidates);
      expect(selectionCount(state)).toBe(5);

      // Simulate the user toggling an extra card (may come from any feed filter)
      const withExtra = matcherReducer(state, {
        type: "toggleProposicao",
        proposicao: card(6),
      });
      expect(selectionCount(withExtra)).toBe(6);

      // Act — navigating between steps (which happens when feed controls fire) must
      // not touch selected; the feed state lives in a separate reducer
      const forward = matcherReducer(withExtra, { type: "goToStep", step: "posicoes" });
      const back = matcherReducer(forward, { type: "goToStep", step: "selecao" });

      // Assert — selection is intact even though none of cards 1–6 may be visible
      // in the feed when a tema or ordenacao filter is active
      expect(selectionCount(back)).toBe(6);
      expect(back.selected.map((c) => c.externalIdProposicao)).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe("setApenasEmAtividade", () => {
    it("sets apenasEmAtividade to true", () => {
      // Arrange
      const state = initMatcherState(candidates);

      // Act
      const next = matcherReducer(state, { type: "setApenasEmAtividade", value: true });

      // Assert
      expect(next.apenasEmAtividade).toBe(true);
    });

    it("sets apenasEmAtividade to false", () => {
      // Arrange
      const state = { ...initMatcherState(candidates), apenasEmAtividade: true };

      // Act
      const next = matcherReducer(state, { type: "setApenasEmAtividade", value: false });

      // Assert
      expect(next.apenasEmAtividade).toBe(false);
    });

    it("clears both resultado caches when toggled", () => {
      // Arrange
      const r = resultado("estadual");
      const state = {
        ...initMatcherState(candidates),
        resultados: { estadual: r, nacional: r },
      };

      // Act
      const next = matcherReducer(state, { type: "setApenasEmAtividade", value: true });

      // Assert
      expect(next.resultados.estadual).toBeNull();
      expect(next.resultados.nacional).toBeNull();
    });

    it("does not affect other state fields", () => {
      // Arrange
      const state = { ...initMatcherState(candidates), escopo: "nacional" as const };

      // Act
      const next = matcherReducer(state, { type: "setApenasEmAtividade", value: true });

      // Assert
      expect(next.escopo).toBe("nacional");
      expect(next.step).toBe(state.step);
    });
  });

  describe("initMatcherState", () => {
    it("initialises apenasEmAtividade to false", () => {
      // Act
      const state = initMatcherState([]);

      // Assert
      expect(state.apenasEmAtividade).toBe(false);
    });
  });

  describe("canRunMatcher", () => {
    function withComputaveis(state = initMatcherState(candidates)) {
      let next = matcherReducer(state, {
        type: "setLocal",
        siglaUf: "SP",
        cidade: "",
      });
      for (const id of [1, 2, 3]) {
        next = matcherReducer(next, {
          type: "setPosicao",
          externalIdProposicao: id,
          posicao: "aprovar",
        });
      }
      return next;
    }

    it("is false without a UF even with enough computable positions", () => {
      // Arrange
      let state = initMatcherState(candidates);
      for (const id of [1, 2, 3]) {
        state = matcherReducer(state, {
          type: "setPosicao",
          externalIdProposicao: id,
          posicao: "aprovar",
        });
      }

      // Act / Assert
      expect(canRunMatcher(state)).toBe(false);
    });

    it("is false with fewer than the minimum computable positions", () => {
      // Arrange
      const state = matcherReducer(initMatcherState(candidates), {
        type: "setLocal",
        siglaUf: "SP",
        cidade: "",
      });

      // Act / Assert
      expect(canRunMatcher(state)).toBe(false);
    });

    it("is true with a UF and at least the minimum computable positions", () => {
      // Arrange
      const state = withComputaveis();

      // Act / Assert
      expect(canRunMatcher(state)).toBe(true);
    });
  });
});
