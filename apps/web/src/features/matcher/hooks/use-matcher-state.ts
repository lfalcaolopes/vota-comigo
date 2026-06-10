"use client";

import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
  SiglaUf,
} from "@vota-comigo/shared-types";
import { useReducer } from "react";

import { runMatcher } from "@/shared/matcher";

import { buildExecucaoRequest } from "../lib/matcher-payload";
import {
  activeResultado,
  canRunMatcher,
  executionValidation,
  initMatcherState,
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

  async function execute() {
    if (state.siglaUf === null || !canRunMatcher(state)) return;
    if (state.status === "loading") return;

    dispatch({ type: "runStart" });

    try {
      const request = buildExecucaoRequest({
        siglaUf: state.siglaUf,
        escopo: state.escopo,
        cidade: state.cidade,
        posicoes: state.posicoes,
      });
      const resultado = await runMatcher(request, {
        limit: PAGE_SIZE,
        offset: 0,
      });
      dispatch({ type: "runOk", escopo: state.escopo, resultado });
    } catch (error) {
      console.error("matcher execution failed", error);
      dispatch({ type: "runError" });
    }
  }

  return {
    state,
    validation: executionValidation(state),
    canRun: canRunMatcher(state),
    selectionCount: selectionCount(state),
    resultado: activeResultado(state),
    setLocal,
    toggleProposicao,
    setPosicao,
    goToStep,
    execute,
  };
}
