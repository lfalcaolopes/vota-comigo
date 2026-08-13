import type { DeputadoCeapCategory } from "@vota-comigo/shared-types";

export type GastoCotaSerie = Omit<
  DeputadoCeapCategory,
  "externalNumSubCota"
> & {
  externalNumSubCota: number | null;
};

export function deriveGastoCotaDistribuicao(
  categories: readonly DeputadoCeapCategory[],
): readonly GastoCotaSerie[] {
  const sorted = [...categories].sort(
    (a, b) =>
      b.amountUsedCents - a.amountUsedCents ||
      a.externalNumSubCota - b.externalNumSubCota,
  );
  const top = sorted.slice(0, 5);
  const remaining = sorted.slice(5);

  if (remaining.length === 0) return top;

  return [
    ...top,
    {
      externalNumSubCota: null,
      description: "Outras despesas",
      amountUsedCents: remaining.reduce(
        (total, category) => total + category.amountUsedCents,
        0,
      ),
    },
  ];
}
