import type { GastoCotaSerie } from "./gasto-cota-distribuicao";

export type GastoCotaDistribuicaoMode = "rosca" | "barras";

export function deriveGastoCotaDistribuicaoMode(
  series: readonly Pick<GastoCotaSerie, "amountUsedCents">[],
  totalAmountUsedCents: number,
): GastoCotaDistribuicaoMode {
  return totalAmountUsedCents <= 0 ||
    series.some((serie) => serie.amountUsedCents < 0)
    ? "barras"
    : "rosca";
}
