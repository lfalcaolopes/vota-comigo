import type { GastoCotaSerie } from "./gasto-cota-distribuicao";

export const GASTO_COTA_COR_NEUTRA = "#737373";

const corByExternalNumSubCota = new Map<number, string>([
  [5, "#332288"],
  [3, "#0077BB"],
  [120, "#009988"],
  [1, "#228833"],
  [999, "#999933"],
  [998, "#EE7733"],
  [10, "#CC3311"],
  [4, "#AA3377"],
]);

export function getGastoCotaCor(externalNumSubCota: number | null): string {
  if (externalNumSubCota === null) return GASTO_COTA_COR_NEUTRA;
  return (
    corByExternalNumSubCota.get(externalNumSubCota) ??
    deriveGastoCotaCorSecundaria(externalNumSubCota)
  );
}

function deriveGastoCotaCorSecundaria(externalNumSubCota: number): string {
  const hue = ((externalNumSubCota * 137.508) % 360).toFixed(1);
  return `oklch(0.64 0.08 ${hue})`;
}

export function applyGastoCotaPaleta(
  series: readonly GastoCotaSerie[],
): readonly (GastoCotaSerie & { color: string })[] {
  return series.map((serie) => ({
    ...serie,
    color: getGastoCotaCor(serie.externalNumSubCota),
  }));
}
