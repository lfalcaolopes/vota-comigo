const STAGGER_MS = 120;
const DURATION_FLOOR_MS = 1200;
const DURATION_SPAN_MS = 1800;

export type GastoCotaRevealStep = {
  delayMs: number;
  durationMs: number;
};

export type GastoCotaRevealTimeline = {
  steps: readonly GastoCotaRevealStep[];
  totalDurationMs: number;
};

// A duração carrega o tamanho da rubrica: com duração fixa, a barra de 1% anda
// poucos pixels e parece travada ao lado da barra de 38%.
export function deriveGastoCotaRevealTimeline(
  amountsUsedCents: readonly number[],
): GastoCotaRevealTimeline {
  const maxAmountUsedCents = Math.max(0, ...amountsUsedCents);

  const steps = amountsUsedCents.map((amountUsedCents, index) => ({
    delayMs: index * STAGGER_MS,
    durationMs: toDurationMs(amountUsedCents, maxAmountUsedCents),
  }));

  return { steps, totalDurationMs: toTotalDurationMs(steps) };
}

function toDurationMs(
  amountUsedCents: number,
  maxAmountUsedCents: number,
): number {
  if (maxAmountUsedCents <= 0) return DURATION_FLOOR_MS;

  const share = Math.max(0, amountUsedCents) / maxAmountUsedCents;
  return Math.round(DURATION_FLOOR_MS + DURATION_SPAN_MS * share);
}

function toTotalDurationMs(steps: readonly GastoCotaRevealStep[]): number {
  return steps.reduce(
    (total, step) => Math.max(total, step.delayMs + step.durationMs),
    0,
  );
}
