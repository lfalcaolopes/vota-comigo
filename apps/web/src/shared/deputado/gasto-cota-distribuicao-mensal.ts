import type {
  DeputadoCeapCategory,
  DeputadoCeapMonth,
} from "@vota-comigo/shared-types";

import {
  deriveGastoCotaDistribuicao,
  type GastoCotaSerie,
} from "./gasto-cota-distribuicao";

export type GastoCotaDistribuicaoMensal = {
  series: readonly GastoCotaSerie[];
  months: readonly GastoCotaMes[];
  totalAmountUsedCents: number;
};

export type GastoCotaMes = DeputadoCeapMonth & {
  amountUsedCentsBySeries: readonly number[] | null;
};

export function deriveGastoCotaDistribuicaoMensal(
  categories: readonly DeputadoCeapCategory[],
  months: readonly DeputadoCeapMonth[],
): GastoCotaDistribuicaoMensal {
  const series = deriveGastoCotaDistribuicao(categories);
  const topCategoryCodes = new Set(
    series.flatMap((serie) =>
      serie.externalNumSubCota === null ? [] : [serie.externalNumSubCota],
    ),
  );
  const projectedMonths = months.map((month) => {
    if (month.totalAmountUsedCents === null) {
      return { ...month, amountUsedCentsBySeries: null };
    }

    const amountByCategoryCode = new Map(
      month.categories.map((category) => [
        category.externalNumSubCota,
        category.amountUsedCents,
      ]),
    );

    return {
      ...month,
      amountUsedCentsBySeries: series.map((serie) =>
        serie.externalNumSubCota === null
          ? month.categories.reduce(
              (total, category) =>
                topCategoryCodes.has(category.externalNumSubCota)
                  ? total
                  : total + category.amountUsedCents,
              0,
            )
          : (amountByCategoryCode.get(serie.externalNumSubCota) ?? 0),
      ),
    };
  });

  return {
    series,
    months: projectedMonths,
    totalAmountUsedCents: projectedMonths.reduce(
      (total, month) =>
        total +
        (month.amountUsedCentsBySeries?.reduce(
          (monthTotal, amount) => monthTotal + amount,
          0,
        ) ?? 0),
      0,
    ),
  };
}
