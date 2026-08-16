"use client";

import Link from "next/link";

import {
  MATCHER_ROUTE_ORDER,
  stepStatus,
  type MatcherRoute,
} from "../../lib/matcher-route";
import { MATCHER_STEP_LABELS } from "../../lib/matcher-step-labels";

type StepIndicatorProps = {
  currentRoute: MatcherRoute;
};

export function StepIndicator({ currentRoute }: StepIndicatorProps) {
  return (
    <ol className="flex flex-wrap justify-start gap-2 text-xs font-[650] tabular-nums text-muted">
      {MATCHER_ROUTE_ORDER.map((route, position) => {
        const status = stepStatus(currentRoute, route);

        if (status === "done") {
          return (
            <li key={route}>
              <Link
                className="cursor-pointer rounded-full border border-border px-2.5 py-1 hover:border-primary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                href={route}
              >
                <StepLabel
                  label={MATCHER_STEP_LABELS[route]}
                  position={position}
                />
              </Link>
            </li>
          );
        }

        if (status === "current") {
          return (
            <li
              aria-current="step"
              className="rounded-full border border-primary bg-primary-soft px-2.5 py-1 text-ink"
              key={route}
            >
              <StepLabel
                label={MATCHER_STEP_LABELS[route]}
                position={position}
              />
            </li>
          );
        }

        return (
          <li
            className="rounded-full border border-border px-2.5 py-1 opacity-50"
            key={route}
          >
            <StepLabel label={MATCHER_STEP_LABELS[route]} position={position} />
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
