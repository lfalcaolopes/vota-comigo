export type GastoCotaPontoMensal = {
  monthIndex: number;
  seriesIndex: number;
};

export type GastoCotaSelecaoMensal = {
  previewPoint: GastoCotaPontoMensal | null;
  pinnedPoint: GastoCotaPontoMensal | null;
};

export type GastoCotaSelecaoMensalAction =
  | { type: "preview"; point: GastoCotaPontoMensal }
  | { type: "clear-preview" }
  | { type: "pin"; point: GastoCotaPontoMensal }
  | { type: "clear" };

export const gastoCotaSelecaoMensalInicial: GastoCotaSelecaoMensal = {
  previewPoint: null,
  pinnedPoint: null,
};

export function reduceGastoCotaSelecaoMensal(
  state: GastoCotaSelecaoMensal,
  action: GastoCotaSelecaoMensalAction,
): GastoCotaSelecaoMensal {
  if (action.type === "preview") {
    if (
      state.previewPoint?.monthIndex === action.point.monthIndex &&
      state.previewPoint.seriesIndex === action.point.seriesIndex
    ) {
      return state;
    }
    return { ...state, previewPoint: action.point };
  }
  if (action.type === "clear-preview") {
    return { ...state, previewPoint: null };
  }
  if (action.type === "clear") return gastoCotaSelecaoMensalInicial;
  const isPinnedPoint =
    state.pinnedPoint?.monthIndex === action.point.monthIndex &&
    state.pinnedPoint.seriesIndex === action.point.seriesIndex;
  return {
    previewPoint: null,
    pinnedPoint: isPinnedPoint ? null : action.point,
  };
}

export function getGastoCotaPontoMensalAtivo(
  state: GastoCotaSelecaoMensal,
): GastoCotaPontoMensal | null {
  return state.previewPoint ?? state.pinnedPoint;
}
