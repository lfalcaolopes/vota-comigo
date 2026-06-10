import type {
  EscopoMatcher,
  MatcherDeputadoResumo,
  MatcherResultado,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  activeResultado,
  canRunMatcher,
  hasMoreDeputados,
  initMatcherState,
  matcherReducer,
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
