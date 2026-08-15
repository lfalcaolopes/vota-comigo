"use client";

import type {
  EscopoMatcher,
  PosicaoUsuarioMatcher,
  ProposicaoCard,
  SiglaUf,
} from "@vota-comigo/shared-types";
import { useEffect, useReducer, useRef } from "react";

import { runMatcher } from "@/shared/matcher";

import { buildExecucaoRequest } from "../lib/matcher-payload";
import type { ResultadoUrlState } from "../lib/matcher-route";
import {
  clearRascunho,
  loadRascunho,
  saveRascunho,
} from "../lib/matcher-rascunho-storage";
import { hasRascunhoEntries } from "../lib/matcher-rascunho";
import type { ResultadoFiltros } from "../lib/resultado-filtros";
import {
  activeResultado,
  canAdvanceSelecao,
  canRunMatcher,
  executionValidation,
  hasMoreDeputados,
  initMatcherState,
  matcherReducer,
  selectionCount,
} from "../lib/matcher-state";

const PAGE_SIZE = 20;

// O escopo e a atividade vêm da URL; a concordância vem do rascunho, por
// decisão do ADR 021. A execução precisa das duas fontes juntas.
export type ResultadoExecucaoFiltros = ResultadoUrlState & ResultadoFiltros;

export function useMatcherState() {
  const [state, dispatch] = useReducer(matcherReducer, [], initMatcherState);
  const resultadoRequestIdRef = useRef(0);

  useEffect(() => {
    const rascunho = loadRascunho(window.sessionStorage);
    dispatch({ type: "hydrateRascunho", rascunho });
  }, []);

  useEffect(() => {
    if (!state.isHydrated) return;

    const rascunho = {
      siglaUf: state.siglaUf,
      cidade: state.cidade,
      escopo: state.escopo,
      selected: state.selected,
      posicoes: state.posicoes,
      externalIdProposicoesFiltroConcordancia:
        state.externalIdProposicoesFiltroConcordancia,
    };

    if (hasRascunhoEntries(rascunho)) {
      saveRascunho(window.sessionStorage, rascunho);
    } else {
      clearRascunho(window.sessionStorage);
    }
  }, [
    state.cidade,
    state.escopo,
    state.externalIdProposicoesFiltroConcordancia,
    state.isHydrated,
    state.posicoes,
    state.selected,
    state.siglaUf,
  ]);

  function setLocal(siglaUf: SiglaUf, cidade: string) {
    dispatch({ type: "setLocal", siglaUf, cidade });
  }

  function toggleProposicao(proposicao: ProposicaoCard) {
    dispatch({ type: "toggleProposicao", proposicao });
  }

  function setPosicao(
    externalIdProposicao: number,
    posicao: PosicaoUsuarioMatcher,
  ) {
    dispatch({ type: "setPosicao", externalIdProposicao, posicao });
  }

  async function runFetch(
    escopo: EscopoMatcher,
    offset: number,
    append: boolean,
    apenasEmAtividade: boolean = state.apenasEmAtividade,
    externalIdProposicoesFiltroConcordancia: readonly number[] = state.externalIdProposicoesFiltroConcordancia,
  ) {
    if (state.siglaUf === null || !canRunMatcher(state)) return false;
    if (append && state.status === "loading") return false;

    const requestId = resultadoRequestIdRef.current + 1;
    resultadoRequestIdRef.current = requestId;

    dispatch({ type: "runStart" });

    try {
      const request = buildExecucaoRequest({
        siglaUf: state.siglaUf,
        escopo,
        cidade: state.cidade,
        posicoes: state.posicoes,
        apenasEmAtividade,
        externalIdProposicoesFiltroConcordancia,
      });
      const resultado = await runMatcher(request, { limit: PAGE_SIZE, offset });
      if (requestId !== resultadoRequestIdRef.current) return false;
      if (append) {
        dispatch({ type: "loadMoreOk", escopo, resultado });
      } else {
        dispatch({ type: "runOk", escopo, resultado });
      }
      return true;
    } catch {
      if (requestId !== resultadoRequestIdRef.current) return false;
      dispatch({ type: "runError" });
      return false;
    }
  }

  async function execute() {
    return runFetch(state.escopo, 0, false);
  }

  async function executeResultado(filters: ResultadoExecucaoFiltros) {
    dispatch({ type: "setResultadoFilters", ...filters });
    return runFetch(
      filters.escopo,
      0,
      false,
      filters.apenasEmAtividade,
      filters.externalIdProposicoesFiltroConcordancia,
    );
  }

  async function setEscopo(escopo: EscopoMatcher) {
    if (escopo === state.escopo) return;
    dispatch({ type: "setEscopo", escopo });
    if (state.resultados[escopo] === null) {
      await runFetch(escopo, 0, false);
    }
  }

  async function loadMore() {
    const r = activeResultado(state);
    if (!r || r.deputados.length >= r.total) return;
    await runFetch(state.escopo, r.deputados.length, true);
  }

  async function toggleFiltroConcordancia(externalIdProposicao: number) {
    const isMarked =
      state.externalIdProposicoesFiltroConcordancia.includes(
        externalIdProposicao,
      );
    const next = isMarked
      ? state.externalIdProposicoesFiltroConcordancia.filter(
          (id) => id !== externalIdProposicao,
        )
      : [
          ...state.externalIdProposicoesFiltroConcordancia,
          externalIdProposicao,
        ];
    dispatch({ type: "toggleFiltroConcordancia", externalIdProposicao });
    await runFetch(state.escopo, 0, false, state.apenasEmAtividade, next);
  }

  function startComparativoSelection() {
    dispatch({ type: "startComparativoSelection" });
  }

  function toggleComparativoDeputado(externalIdDeputado: number) {
    const deputado = activeResultado(state)?.deputados.find(
      (item) => item.externalIdDeputado === externalIdDeputado,
    );
    if (!deputado) return;

    dispatch({ type: "toggleComparativoDeputado", deputado });
  }

  function cancelComparativoSelection() {
    dispatch({ type: "cancelComparativoSelection" });
  }

  function resetMatcher() {
    resultadoRequestIdRef.current += 1;
    clearRascunho(window.sessionStorage);
    dispatch({ type: "resetMatcher" });
  }

  return {
    state,
    isHydrated: state.isHydrated,
    validation: executionValidation(state),
    canAdvanceSelecao: canAdvanceSelecao(state),
    canRun: canRunMatcher(state),
    selectionCount: selectionCount(state),
    resultado: activeResultado(state),
    escopo: state.escopo,
    apenasEmAtividade: state.apenasEmAtividade,
    externalIdProposicoesFiltroConcordancia:
      state.externalIdProposicoesFiltroConcordancia,
    hasMore: hasMoreDeputados(state),
    setLocal,
    toggleProposicao,
    setPosicao,
    execute,
    executeResultado,
    setEscopo,
    toggleFiltroConcordancia,
    loadMore,
    startComparativoSelection,
    toggleComparativoDeputado,
    cancelComparativoSelection,
    resetMatcher,
  };
}
