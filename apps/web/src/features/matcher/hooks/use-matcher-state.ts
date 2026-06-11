"use client";

import type {
  EscopoMatcher,
  PosicaoUsuarioMatcher,
  ProposicaoCard,
  SiglaUf,
} from "@vota-comigo/shared-types";
import { useReducer } from "react";

import { getDeputadoDetalhe, runMatcher } from "@/shared/matcher";

import { buildExecucaoRequest } from "../lib/matcher-payload";
import {
  activeResultado,
  canRunMatcher,
  executionValidation,
  hasMoreDeputados,
  initMatcherState,
  isDetalheOpen,
  matcherReducer,
  selectionCount,
  type MatcherStep,
} from "../lib/matcher-state";

const PAGE_SIZE = 20;

export function useMatcherState(candidates: ProposicaoCard[]) {
  const [state, dispatch] = useReducer(
    matcherReducer,
    candidates,
    initMatcherState,
  );

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

  function goToStep(step: MatcherStep) {
    dispatch({ type: "goToStep", step });
  }

  async function runFetch(escopo: EscopoMatcher, offset: number, append: boolean) {
    if (state.siglaUf === null || !canRunMatcher(state)) return;
    if (state.status === "loading") return;

    dispatch({ type: "runStart" });

    try {
      const request = buildExecucaoRequest({
        siglaUf: state.siglaUf,
        escopo,
        cidade: state.cidade,
        posicoes: state.posicoes,
      });
      const resultado = await runMatcher(request, { limit: PAGE_SIZE, offset });
      if (append) {
        dispatch({ type: "loadMoreOk", escopo, resultado });
      } else {
        dispatch({ type: "runOk", escopo, resultado });
      }
    } catch {
      dispatch({ type: "runError" });
    }
  }

  async function execute() {
    await runFetch(state.escopo, 0, false);
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

  async function openDetalhe(externalIdDeputado: number) {
    if (state.siglaUf === null || !canRunMatcher(state)) return;

    dispatch({ type: "openDetalheStart", externalIdDeputado });

    try {
      const request = buildExecucaoRequest({
        siglaUf: state.siglaUf,
        escopo: state.escopo,
        cidade: state.cidade,
        posicoes: state.posicoes,
      });
      const detalhe = await getDeputadoDetalhe(externalIdDeputado, request);
      dispatch({ type: "openDetalheOk", detalhe });
    } catch {
      dispatch({ type: "openDetalheError" });
    }
  }

  function closeDetalhe() {
    dispatch({ type: "closeDetalhe" });
  }

  return {
    state,
    validation: executionValidation(state),
    canRun: canRunMatcher(state),
    selectionCount: selectionCount(state),
    resultado: activeResultado(state),
    escopo: state.escopo,
    hasMore: hasMoreDeputados(state),
    detalhe: state.detalhe,
    detalheStatus: state.detalheStatus,
    isDetalheOpen: isDetalheOpen(state),
    setLocal,
    toggleProposicao,
    setPosicao,
    goToStep,
    execute,
    setEscopo,
    loadMore,
    openDetalhe,
    closeDetalhe,
  };
}
