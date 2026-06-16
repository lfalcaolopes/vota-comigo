import { MAX_POSICOES } from "@vota-comigo/shared-types";
import type {
  DeputadoPerfil,
  EscopoMatcher,
  MatcherDeputadoDetalhe,
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

export type MatcherStep =
  | "local"
  | "selecao"
  | "posicoes"
  | "resultado"
  | "comparativo";
export type MatcherStatus = "idle" | "loading" | "error";
export type StepStatus = "done" | "current" | "upcoming";
export type MainMatcherStep = Exclude<MatcherStep, "comparativo">;

export const STEP_ORDER: MainMatcherStep[] = [
  "local",
  "selecao",
  "posicoes",
  "resultado",
];

export function stepStatus(current: MatcherStep, step: MainMatcherStep): StepStatus {
  const currentIndex =
    current === "comparativo" ? STEP_ORDER.length : STEP_ORDER.indexOf(current);
  const stepIndex = STEP_ORDER.indexOf(step);
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "current";
  return "upcoming";
}

const PRESELECTED_COUNT = 5;
const MIN_COMPARATIVO_DEPUTADOS = 2;
const MAX_COMPARATIVO_DEPUTADOS = 3;

export type MatcherState = {
  step: MatcherStep;
  siglaUf: SiglaUf | null;
  cidade: string;
  selected: ProposicaoCard[];
  posicoes: Map<number, PosicaoUsuarioMatcher>;
  resultados: Record<EscopoMatcher, MatcherResultado | null>;
  escopo: EscopoMatcher;
  apenasEmAtividade: boolean;
  detalhe: MatcherDeputadoDetalhe | null;
  detalheStatus: MatcherStatus;
  detalheDeputadoId: number | null;
  status: MatcherStatus;
  isSelectingComparativoDeputados: boolean;
  selectedComparativoDeputados: MatcherDeputadoResumo[];
  comparativoStatus: MatcherStatus;
  comparativoDetalhes: MatcherDeputadoDetalhe[];
  comparativoPerfis: DeputadoPerfil[];
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
  | { type: "setApenasEmAtividade"; value: boolean }
  | { type: "loadMoreOk"; escopo: EscopoMatcher; resultado: MatcherResultado }
  | { type: "openDetalheStart"; externalIdDeputado: number }
  | { type: "openDetalheOk"; detalhe: MatcherDeputadoDetalhe }
  | { type: "openDetalheError" }
  | { type: "closeDetalhe" }
  | { type: "startComparativoSelection" }
  | { type: "toggleComparativoDeputado"; deputado: MatcherDeputadoResumo }
  | { type: "cancelComparativoSelection" }
  | { type: "openComparativoStart" }
  | {
      type: "openComparativoOk";
      detalhes: MatcherDeputadoDetalhe[];
      perfis: DeputadoPerfil[];
    }
  | { type: "openComparativoError" }
  | { type: "backFromComparativo" };

export function initMatcherState(candidates: ProposicaoCard[]): MatcherState {
  return {
    step: "local",
    siglaUf: null,
    cidade: "",
    selected: candidates.slice(0, PRESELECTED_COUNT),
    posicoes: new Map(),
    resultados: { estadual: null, nacional: null },
    escopo: "estadual",
    apenasEmAtividade: false,
    detalhe: null,
    detalheStatus: "idle",
    detalheDeputadoId: null,
    status: "idle",
    isSelectingComparativoDeputados: false,
    selectedComparativoDeputados: [],
    comparativoStatus: "idle",
    comparativoDetalhes: [],
    comparativoPerfis: [],
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
    case "setApenasEmAtividade":
      return {
        ...state,
        apenasEmAtividade: action.value,
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
    case "openDetalheStart":
      return {
        ...state,
        detalheStatus: "loading",
        detalheDeputadoId: action.externalIdDeputado,
        detalhe: null,
      };
    case "openDetalheOk":
      return { ...state, detalheStatus: "idle", detalhe: action.detalhe };
    case "openDetalheError":
      return { ...state, detalheStatus: "error" };
    case "closeDetalhe":
      return {
        ...state,
        detalhe: null,
        detalheDeputadoId: null,
        detalheStatus: "idle",
      };
    case "startComparativoSelection":
      return {
        ...state,
        isSelectingComparativoDeputados: true,
        selectedComparativoDeputados: [],
        comparativoStatus: "idle",
        comparativoDetalhes: [],
        comparativoPerfis: [],
        detalhe: null,
        detalheDeputadoId: null,
        detalheStatus: "idle",
      };
    case "toggleComparativoDeputado": {
      const id = action.deputado.externalIdDeputado;
      if (hasSelectedComparativoDeputado(state, id)) {
        return deselectComparativoDeputado(state, id);
      }
      if (state.selectedComparativoDeputados.length >= MAX_COMPARATIVO_DEPUTADOS) {
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
        comparativoStatus: "idle",
        comparativoDetalhes: [],
        comparativoPerfis: [],
      };
    case "openComparativoStart":
      if (!canOpenComparativo(state)) return state;
      return {
        ...state,
        step: "comparativo",
        comparativoStatus: "loading",
        comparativoDetalhes: [],
        comparativoPerfis: [],
        isSelectingComparativoDeputados: false,
      };
    case "openComparativoOk":
      return {
        ...state,
        comparativoStatus: "idle",
        comparativoDetalhes: action.detalhes,
        comparativoPerfis: action.perfis,
      };
    case "openComparativoError":
      return {
        ...state,
        comparativoStatus: "error",
        comparativoDetalhes: [],
        comparativoPerfis: [],
      };
    case "backFromComparativo":
      return {
        ...state,
        step: "resultado",
        isSelectingComparativoDeputados: false,
        selectedComparativoDeputados: [],
        comparativoStatus: "idle",
        comparativoDetalhes: [],
        comparativoPerfis: [],
      };
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

export function isDetalheOpen(state: MatcherState): boolean {
  return state.detalheDeputadoId !== null;
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
