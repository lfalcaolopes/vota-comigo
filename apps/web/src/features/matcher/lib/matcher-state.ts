import {
  MAX_POSICOES,
  MIN_POSICOES_COMPUTAVEIS,
} from "@vota-comigo/shared-types";
import type {
  EscopoMatcher,
  MatcherDeputadoResumo,
  MatcherResultado,
  PosicaoUsuarioMatcher,
  ProposicaoCard,
  SiglaUf,
} from "@vota-comigo/shared-types";

import {
  validateExecucao,
  type ExecucaoValidation,
} from "./matcher-validation";
import type { MatcherRascunho } from "./matcher-rascunho";

export type MatcherStatus = "idle" | "loading" | "error";

const MIN_COMPARATIVO_DEPUTADOS = 2;
const MAX_COMPARATIVO_DEPUTADOS = 3;

export type MatcherState = {
  isHydrated: boolean;
  siglaUf: SiglaUf | null;
  cidade: string;
  selected: ProposicaoCard[];
  posicoes: Map<number, PosicaoUsuarioMatcher>;
  resultados: Record<EscopoMatcher, MatcherResultado | null>;
  escopo: EscopoMatcher;
  apenasEmAtividade: boolean;
  externalIdProposicoesFiltroConcordancia: number[];
  status: MatcherStatus;
  isSelectingComparativoDeputados: boolean;
  selectedComparativoDeputados: MatcherDeputadoResumo[];
};

export type MatcherAction =
  | { type: "hydrateRascunho"; rascunho: MatcherRascunho | null }
  | { type: "resetMatcher" }
  | { type: "setLocal"; siglaUf: SiglaUf; cidade: string }
  | { type: "toggleProposicao"; proposicao: ProposicaoCard }
  | {
      type: "setPosicao";
      externalIdProposicao: number;
      posicao: PosicaoUsuarioMatcher;
    }
  | { type: "runStart" }
  | { type: "runOk"; escopo: EscopoMatcher; resultado: MatcherResultado }
  | { type: "runError" }
  | { type: "setEscopo"; escopo: EscopoMatcher }
  | {
      type: "setResultadoFilters";
      escopo: EscopoMatcher;
      apenasEmAtividade: boolean;
    }
  | { type: "setApenasEmAtividade"; value: boolean }
  | {
      type: "toggleFiltroConcordancia";
      externalIdProposicao: number;
    }
  | { type: "clearFiltroConcordancia" }
  | { type: "loadMoreOk"; escopo: EscopoMatcher; resultado: MatcherResultado }
  | { type: "startComparativoSelection" }
  | { type: "toggleComparativoDeputado"; deputado: MatcherDeputadoResumo }
  | { type: "cancelComparativoSelection" };

export function initMatcherState(candidates: ProposicaoCard[]): MatcherState {
  void candidates;

  return {
    isHydrated: false,
    siglaUf: null,
    cidade: "",
    selected: [],
    posicoes: new Map(),
    resultados: { estadual: null, nacional: null },
    escopo: "estadual",
    apenasEmAtividade: false,
    externalIdProposicoesFiltroConcordancia: [],
    status: "idle",
    isSelectingComparativoDeputados: false,
    selectedComparativoDeputados: [],
  };
}

function isSelected(
  state: MatcherState,
  externalIdProposicao: number,
): boolean {
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

function hasSelectedComparativoDeputado(
  state: MatcherState,
  externalIdDeputado: number,
): boolean {
  return state.selectedComparativoDeputados.some(
    (deputado) => deputado.externalIdDeputado === externalIdDeputado,
  );
}

function deselectComparativoDeputado(
  state: MatcherState,
  externalIdDeputado: number,
): MatcherState {
  return {
    ...state,
    selectedComparativoDeputados: state.selectedComparativoDeputados.filter(
      (deputado) => deputado.externalIdDeputado !== externalIdDeputado,
    ),
  };
}

export function matcherReducer(
  state: MatcherState,
  action: MatcherAction,
): MatcherState {
  switch (action.type) {
    case "hydrateRascunho":
      return action.rascunho === null
        ? { ...state, isHydrated: true }
        : { ...state, ...action.rascunho, isHydrated: true };
    case "resetMatcher":
      return { ...initMatcherState([]), isHydrated: true };
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
    case "runStart":
      return { ...state, status: "loading" };
    case "runOk":
      return {
        ...state,
        status: "idle",
        escopo: action.escopo,
        resultados: { ...state.resultados, [action.escopo]: action.resultado },
      };
    case "runError":
      return { ...state, status: "error" };
    case "setEscopo":
      return { ...state, escopo: action.escopo };
    case "setResultadoFilters":
      return {
        ...state,
        escopo: action.escopo,
        apenasEmAtividade: action.apenasEmAtividade,
        resultados: {
          ...state.resultados,
          [action.escopo]: null,
        },
      };
    case "setApenasEmAtividade":
      return {
        ...state,
        apenasEmAtividade: action.value,
        resultados: { estadual: null, nacional: null },
      };
    case "toggleFiltroConcordancia": {
      const isMarked = state.externalIdProposicoesFiltroConcordancia.includes(
        action.externalIdProposicao,
      );
      return {
        ...state,
        externalIdProposicoesFiltroConcordancia: isMarked
          ? state.externalIdProposicoesFiltroConcordancia.filter(
              (externalIdProposicao) =>
                externalIdProposicao !== action.externalIdProposicao,
            )
          : [
              ...state.externalIdProposicoesFiltroConcordancia,
              action.externalIdProposicao,
            ],
        resultados: { estadual: null, nacional: null },
      };
    }
    case "clearFiltroConcordancia":
      return {
        ...state,
        externalIdProposicoesFiltroConcordancia: [],
        resultados: { estadual: null, nacional: null },
      };
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
    case "startComparativoSelection":
      return {
        ...state,
        isSelectingComparativoDeputados: true,
        selectedComparativoDeputados: [],
      };
    case "toggleComparativoDeputado": {
      const id = action.deputado.externalIdDeputado;
      if (hasSelectedComparativoDeputado(state, id)) {
        return deselectComparativoDeputado(state, id);
      }
      if (
        state.selectedComparativoDeputados.length >= MAX_COMPARATIVO_DEPUTADOS
      ) {
        return state;
      }
      return {
        ...state,
        selectedComparativoDeputados: [
          ...state.selectedComparativoDeputados,
          action.deputado,
        ],
      };
    }
    case "cancelComparativoSelection":
      return {
        ...state,
        isSelectingComparativoDeputados: false,
        selectedComparativoDeputados: [],
      };
  }
}

export function selectionCount(state: MatcherState): number {
  return state.selected.length;
}

export function canAdvanceSelecao(state: MatcherState): boolean {
  return state.selected.length >= MIN_POSICOES_COMPUTAVEIS;
}

export function executionValidation(state: MatcherState): ExecucaoValidation {
  const selectedPosicoes = state.selected
    .map((card) => state.posicoes.get(card.externalIdProposicao))
    .filter(
      (posicao): posicao is PosicaoUsuarioMatcher => posicao !== undefined,
    );

  return validateExecucao({
    totalSelecionadas: state.selected.length,
    posicoes: selectedPosicoes,
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

export type ResultadoDisplay = "loading" | "error" | "empty" | "results";

export function resultadoDisplay(state: MatcherState): ResultadoDisplay {
  const r = activeResultado(state);
  if (state.status === "loading" && !r) return "loading";
  if (state.status === "error" && !r) return "error";
  if (!r || r.deputados.length === 0) return "empty";
  return "results";
}

export function isSemBomMatch(resultado: MatcherResultado | null): boolean {
  return resultado?.semBomMatch === true;
}

export function isComparativoSelectionMode(state: MatcherState): boolean {
  return state.isSelectingComparativoDeputados;
}

export function canOpenComparativo(state: MatcherState): boolean {
  return (
    state.selectedComparativoDeputados.length >= MIN_COMPARATIVO_DEPUTADOS &&
    state.selectedComparativoDeputados.length <= MAX_COMPARATIVO_DEPUTADOS
  );
}

export function hasComparativoDeputadoLimit(state: MatcherState): boolean {
  return state.selectedComparativoDeputados.length >= MAX_COMPARATIVO_DEPUTADOS;
}
