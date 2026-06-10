import { MAX_POSICOES } from "@vota-comigo/shared-types";
import type {
  EscopoMatcher,
  MatcherDeputadoDetalhe,
  MatcherResultado,
  PosicaoUsuarioMatcher,
  ProposicaoCard,
  SiglaUf,
} from "@vota-comigo/shared-types";

import {
  validateExecucao,
  type ExecucaoValidation,
} from "./matcher-validation";

export type MatcherStep = "local" | "selecao" | "posicoes" | "resultado";
export type MatcherStatus = "idle" | "loading" | "error";
export type StepStatus = "done" | "current" | "upcoming";

export const STEP_ORDER: MatcherStep[] = [
  "local",
  "selecao",
  "posicoes",
  "resultado",
];

export function stepStatus(current: MatcherStep, step: MatcherStep): StepStatus {
  const currentIndex = STEP_ORDER.indexOf(current);
  const stepIndex = STEP_ORDER.indexOf(step);
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "current";
  return "upcoming";
}

const PRESELECTED_COUNT = 5;

export type MatcherState = {
  step: MatcherStep;
  siglaUf: SiglaUf | null;
  cidade: string;
  selected: ProposicaoCard[];
  posicoes: Map<number, PosicaoUsuarioMatcher>;
  resultados: Record<EscopoMatcher, MatcherResultado | null>;
  escopo: EscopoMatcher;
  detalhe: MatcherDeputadoDetalhe | null;
  status: MatcherStatus;
};

export type MatcherAction =
  | { type: "setLocal"; siglaUf: SiglaUf; cidade: string }
  | { type: "toggleProposicao"; proposicao: ProposicaoCard }
  | { type: "setPosicao"; externalIdProposicao: number; posicao: PosicaoUsuarioMatcher }
  | { type: "goToStep"; step: MatcherStep }
  | { type: "runStart" }
  | { type: "runOk"; escopo: EscopoMatcher; resultado: MatcherResultado }
  | { type: "runError" }
  | { type: "setEscopo"; escopo: EscopoMatcher }
  | { type: "loadMoreOk"; escopo: EscopoMatcher; resultado: MatcherResultado };

export function initMatcherState(candidates: ProposicaoCard[]): MatcherState {
  return {
    step: "local",
    siglaUf: null,
    cidade: "",
    selected: candidates.slice(0, PRESELECTED_COUNT),
    posicoes: new Map(),
    resultados: { estadual: null, nacional: null },
    escopo: "estadual",
    detalhe: null,
    status: "idle",
  };
}

function isSelected(state: MatcherState, externalIdProposicao: number): boolean {
  return state.selected.some(
    (card) => card.externalIdProposicao === externalIdProposicao,
  );
}

function deselect(
  state: MatcherState,
  externalIdProposicao: number,
): MatcherState {
  const posicoes = new Map(state.posicoes);
  posicoes.delete(externalIdProposicao);
  return {
    ...state,
    selected: state.selected.filter(
      (card) => card.externalIdProposicao !== externalIdProposicao,
    ),
    posicoes,
  };
}

export function matcherReducer(
  state: MatcherState,
  action: MatcherAction,
): MatcherState {
  switch (action.type) {
    case "setLocal":
      return { ...state, siglaUf: action.siglaUf, cidade: action.cidade };
    case "toggleProposicao": {
      const id = action.proposicao.externalIdProposicao;
      if (isSelected(state, id)) {
        return deselect(state, id);
      }
      if (state.selected.length >= MAX_POSICOES) {
        return state;
      }
      return { ...state, selected: [...state.selected, action.proposicao] };
    }
    case "setPosicao": {
      const posicoes = new Map(state.posicoes);
      posicoes.set(action.externalIdProposicao, action.posicao);
      return { ...state, posicoes };
    }
    case "goToStep":
      return { ...state, step: action.step };
    case "runStart":
      return { ...state, status: "loading" };
    case "runOk":
      return {
        ...state,
        step: "resultado",
        status: "idle",
        escopo: action.escopo,
        resultados: { ...state.resultados, [action.escopo]: action.resultado },
      };
    case "runError":
      return { ...state, status: "error" };
    case "setEscopo":
      return { ...state, escopo: action.escopo };
    case "loadMoreOk": {
      const existing = state.resultados[action.escopo];
      if (existing === null) return state;
      return {
        ...state,
        status: "idle",
        resultados: {
          ...state.resultados,
          [action.escopo]: {
            ...action.resultado,
            deputados: [...existing.deputados, ...action.resultado.deputados],
            total: existing.total,
          },
        },
      };
    }
  }
}

export function selectionCount(state: MatcherState): number {
  return state.selected.length;
}

export function executionValidation(state: MatcherState): ExecucaoValidation {
  return validateExecucao({
    totalSelecionadas: state.selected.length,
    posicoes: [...state.posicoes.values()],
  });
}

export function canRunMatcher(state: MatcherState): boolean {
  return state.siglaUf !== null && executionValidation(state).valid;
}

export function activeResultado(state: MatcherState): MatcherResultado | null {
  return state.resultados[state.escopo];
}

export function hasMoreDeputados(state: MatcherState): boolean {
  const r = activeResultado(state);
  return r ? r.deputados.length < r.total : false;
}
