import { formatGastoCotaAmount } from "./gasto-cota-presentation";

export type GastoCotaComparacaoEscala = {
  domain: readonly [number, number];
  tetoExcedido: boolean;
};

// Com teto conhecido o trilho deixa de ser escala arbitrária e passa a ser o
// próprio limite do ano: a barra mede quanto da cota foi consumido. Só quando o
// total ultrapassa o teto a escala se estende, para o excedente caber na vista.
export function deriveGastoCotaComparacaoEscala(
  totalAmountUsedCents: number,
  medianaAmountUsedCents: number | null,
  tetoAmountCents: number | null,
): GastoCotaComparacaoEscala {
  const referencias = [
    0,
    totalAmountUsedCents,
    medianaAmountUsedCents ?? 0,
    tetoAmountCents ?? 0,
  ];
  const minValue = Math.min(...referencias);
  const maxValue = Math.max(...referencias);

  if (tetoAmountCents !== null && maxValue <= tetoAmountCents) {
    return {
      domain: [
        minValue < 0 ? minValue - tetoAmountCents * 0.08 : 0,
        tetoAmountCents,
      ],
      tetoExcedido: false,
    };
  }

  const padding = Math.max((maxValue - minValue) * 0.08, 1);

  return {
    domain: [minValue < 0 ? minValue - padding : 0, maxValue + padding],
    tetoExcedido: tetoAmountCents !== null,
  };
}

export function formatGastoCotaTeto(
  totalAmountUsedCents: number,
  teto: { amountCents: number; monthCount: number },
  coveredThroughMonth: number,
): string {
  const escopo = teto.monthCount === 12 ? "teto do ano" : "teto do período";

  if (totalAmountUsedCents > teto.amountCents) {
    return `${formatGastoCotaAmount(totalAmountUsedCents - teto.amountCents)} acima do ${escopo}`;
  }

  if (totalAmountUsedCents <= 0) {
    return `Nenhum valor consumido do ${escopo}`;
  }

  const percentage = Math.round(
    (totalAmountUsedCents / teto.amountCents) * 100,
  );
  const parcial =
    coveredThroughMonth < 12
      ? ` (dados até ${nomeDoMes(coveredThroughMonth)})`
      : "";

  return `${percentage}% do ${escopo}${parcial}`;
}

export function formatGastoCotaComparacao(
  totalAmountUsedCents: number,
  medianaAmountUsedCents: number,
): string {
  const difference = totalAmountUsedCents - medianaAmountUsedCents;

  if (difference === 0) return "Mesmo valor da mediana";
  if (medianaAmountUsedCents <= 0 || totalAmountUsedCents < 0) {
    return `${formatGastoCotaAmount(Math.abs(difference))} ${difference < 0 ? "abaixo" : "acima"} da mediana`;
  }

  const percentage = Math.round(
    (Math.abs(difference) / medianaAmountUsedCents) * 100,
  );

  return `${percentage}% ${difference < 0 ? "abaixo" : "acima"} da mediana`;
}

function nomeDoMes(month: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, month - 1, 1)));
}
