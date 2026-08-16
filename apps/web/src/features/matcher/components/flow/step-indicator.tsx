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

const PILL_BASE =
  "flex h-7 items-center rounded-full border px-2.5 leading-none";

export function StepIndicator({ currentRoute }: StepIndicatorProps) {
  return (
    <ol className="flex flex-wrap items-center justify-start gap-2 text-xs font-[650] tabular-nums text-muted">
      {MATCHER_ROUTE_ORDER.map((route, position) => {
        const status = stepStatus(currentRoute, route);
        const label = (
          <StepLabel label={MATCHER_STEP_LABELS[route]} position={position} />
        );

        if (status === "done") {
          return (
            <li className="flex" key={route}>
              <Link
                className={`${PILL_BASE} cursor-pointer border-border hover:border-primary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
                href={route}
              >
                {label}
              </Link>
            </li>
          );
        }

        if (status === "current") {
          return (
            <li aria-current="step" className="flex" key={route}>
              <span
                className={`${PILL_BASE} border-primary bg-primary-soft text-ink`}
              >
                {label}
              </span>
            </li>
          );
        }

        return (
          <li className="flex" key={route}>
            <span className={`${PILL_BASE} border-border opacity-50`}>
              {label}
            </span>
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
