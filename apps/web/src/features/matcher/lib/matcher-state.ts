import {
  MAX_POSICOES,
  MIN_POSICOES_COMPUTAVEIS,
} from "@vota-comigo/shared-types";
import type {
  DeputadoSexo,
  EscopoMatcher,
  MatcherDeputadoResumo,
  MatcherResultado,
  MatcherSort,
  PosicaoUsuarioMatcher,
  ProposicaoCard,
  SiglaUf,
} from "@vota-comigo/shared-types";

import {
  canOpenComparativo as canOpenComparativoDeputados,
  hasComparativoDeputadoLimit as hasComparativoDeputadoLimitReached,
  toggleComparativoDeputado as toggleComparativoDeputadoSelecionado,
} from "@/shared/deputado";

import {
  validateExecucao,
  type ExecucaoValidation,
} from "./matcher-validation";
import { shouldClearFiltroConcordancia } from "./filtro-concordancia-reset";
import type { MatcherRascunho } from "./matcher-rascunho";
import {
  RESULTADO_FILTROS_PADRAO,
  saoResultadoFiltrosIguais,
  toResultadoFiltros,
  type ResultadoFiltros,
} from "./resultado-filtros";

export type MatcherStatus = "idle" | "loading" | "error";

export type MatcherState = {
  isHydrated: boolean;
  siglaUf: SiglaUf | null;
  selected: ProposicaoCard[];
  posicoes: Map<number, PosicaoUsuarioMatcher>;
  resultados: Record<EscopoMatcher, MatcherResultado | null>;
  escopo: EscopoMatcher;
  sort?: MatcherSort;
  apenasEmAtividade: boolean;
  partidos: readonly string[];
  ocultarAmostraPequena: boolean;
  sexo: DeputadoSexo | null;
  externalIdProposicoesFiltroConcordancia: number[];
  status: MatcherStatus;
  isSelectingComparativoDeputados: boolean;
  selectedComparativoDeputados: MatcherDeputadoResumo[];
};

export type MatcherAction =
  | { type: "hydrateRascunho"; rascunho: MatcherRascunho | null }
  | { type: "resetMatcher" }
  | { type: "setLocal"; siglaUf: SiglaUf }
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
  | ({ type: "setResultadoFilters"; escopo: EscopoMatcher } & ResultadoFiltros)
  | {
      type: "toggleFiltroConcordancia";
      externalIdProposicao: number;
    }
  | { type: "loadMoreOk"; escopo: EscopoMatcher; resultado: MatcherResultado }
  | { type: "startComparativoSelection" }
  | { type: "toggleComparativoDeputado"; deputado: MatcherDeputadoResumo }
  | { type: "cancelComparativoSelection" };

export function initMatcherState(candidates: ProposicaoCard[]): MatcherState {
  void candidates;

  return {
    isHydrated: false,
    siglaUf: null,
    selected: [],
    posicoes: new Map(),
    resultados: { estadual: null, nacional: null },
    escopo: "estadual",
    ...RESULTADO_FILTROS_PADRAO,
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

function applyFiltroConcordanciaReset(
  previous: MatcherState,
  next: MatcherState,
): MatcherState {
  return shouldClearFiltroConcordancia(previous, next)
    ? { ...next, externalIdProposicoesFiltroConcordancia: [] }
    : next;
}

function deselect(
  state: MatcherState,
  externalIdProposicao: number,
): MatcherState {
  const posicoes = new Map(state.posicoes);
  posicoes.delete(externalIdProposicao);
  const next = {
    ...state,
    selected: state.selected.filter(
      (card) => card.externalIdProposicao !== externalIdProposicao,
    ),
    posicoes,
  };
  return applyFiltroConcordanciaReset(state, next);
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
      return { ...state, siglaUf: action.siglaUf };
    case "toggleProposicao": {
      const id = action.proposicao.externalIdProposicao;
      if (isSelected(state, id)) {
        return deselect(state, id);
      }
      if (state.selected.length >= MAX_POSICOES) {
        return state;
      }
      const next = {
        ...state,
        selected: [...state.selected, action.proposicao],
      };
      return applyFiltroConcordanciaReset(state, next);
    }
    case "setPosicao": {
      const posicoes = new Map(state.posicoes);
      posicoes.set(action.externalIdProposicao, action.posicao);
      const next = { ...state, posicoes };
      return applyFiltroConcordanciaReset(state, next);
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
    case "setResultadoFilters": {
      // Os recortes valem para os dois escopos, então mudá-los invalida também
      // o resultado que está apenas em cache.
      const mudouRecorte = !saoResultadoFiltrosIguais(action, state);
      return {
        ...state,
        escopo: action.escopo,
        ...toResultadoFiltros(action),
        externalIdProposicoesFiltroConcordancia: [
          ...action.externalIdProposicoesFiltroConcordancia,
        ],
        resultados: mudouRecorte
          ? { estadual: null, nacional: null }
          : { ...state.resultados, [action.escopo]: null },
      };
    }
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
      const selectedComparativoDeputados = toggleComparativoDeputadoSelecionado(
        state.selectedComparativoDeputados,
        action.deputado,
      );
      return selectedComparativoDeputados === state.selectedComparativoDeputados
        ? state
        : {
            ...state,
            selectedComparativoDeputados: [...selectedComparativoDeputados],
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

export function isComparativoSelectionMode(state: MatcherState): boolean {
  return state.isSelectingComparativoDeputados;
}

export function canOpenComparativo(state: MatcherState): boolean {
  return canOpenComparativoDeputados(state.selectedComparativoDeputados);
}

export function hasComparativoDeputadoLimit(state: MatcherState): boolean {
  return hasComparativoDeputadoLimitReached(state.selectedComparativoDeputados);
}
