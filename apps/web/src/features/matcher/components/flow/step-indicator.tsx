"use client";

import {
  STEP_ORDER,
  stepStatus,
  type MainMatcherStep,
  type MatcherStep,
} from "../../lib/matcher-state";

const STEP_LABELS: Record<MainMatcherStep, string> = {
  local: "Onde você vota",
  selecao: "Escolha proposições",
  posicoes: "Sua posição",
  resultado: "Quem vota com você",
};

type StepIndicatorProps = {
  current: MatcherStep;
  onNavigate: (step: MatcherStep) => void;
};

export function StepIndicator({ current, onNavigate }: StepIndicatorProps) {
  return (
    <ol className="flex flex-wrap justify-start gap-2 text-xs font-[650] tabular-nums text-muted">
      {STEP_ORDER.map((step, position) => {
        const status = stepStatus(current, step);

        if (status === "done") {
          return (
            <li key={step}>
              <button
                className="cursor-pointer rounded-full border border-border px-2.5 py-1 hover:border-primary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={() => onNavigate(step)}
                type="button"
              >
                <StepLabel label={STEP_LABELS[step]} position={position} />
              </button>
            </li>
          );
        }

        if (status === "current") {
          return (
            <li
              aria-current="step"
              className="rounded-full border border-primary bg-primary-soft px-2.5 py-1 text-ink"
              key={step}
            >
              <StepLabel label={STEP_LABELS[step]} position={position} />
            </li>
          );
        }

        return (
          <li
            className="rounded-full border border-border px-2.5 py-1 opacity-50"
            key={step}
          >
            <StepLabel label={STEP_LABELS[step]} position={position} />
          </li>
        );
      })}
    </ol>
  );
}

// Mobile shows the step number only; the label stays in the a11y tree (sr-only)
// and becomes visible from sm up, where the header has room for full labels.
function StepLabel({ label, position }: { label: string; position: number }) {
  return (
    <>
      <span aria-hidden="true">{position + 1}</span>
      <span className="sr-only sm:not-sr-only">
        <span aria-hidden="true">{". "}</span>
        {label}
      </span>
    </>
  );
}
