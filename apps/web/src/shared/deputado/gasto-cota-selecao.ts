export type GastoCotaSelecao = {
  previewIndex: number | null;
  pinnedIndex: number | null;
};

export type GastoCotaSelecaoAction =
  | { type: "preview"; index: number }
  | { type: "clear-preview" }
  | { type: "pin"; index: number }
  | { type: "clear" };

export const gastoCotaSelecaoInicial: GastoCotaSelecao = {
  previewIndex: null,
  pinnedIndex: null,
};

export function reduceGastoCotaSelecao(
  state: GastoCotaSelecao,
  action: GastoCotaSelecaoAction,
): GastoCotaSelecao {
  if (action.type === "preview") {
    return { ...state, previewIndex: action.index };
  }
  if (action.type === "clear-preview") {
    return { ...state, previewIndex: null };
  }
  if (action.type === "clear") return gastoCotaSelecaoInicial;
  return {
    previewIndex: null,
    pinnedIndex: state.pinnedIndex === action.index ? null : action.index,
  };
}

export function getGastoCotaIndiceAtivo(
  state: GastoCotaSelecao,
): number | null {
  return state.previewIndex ?? state.pinnedIndex;
}
