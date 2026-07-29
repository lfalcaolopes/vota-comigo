import { track } from "@vercel/analytics";
import type { MatcherCompletionEvent } from "@vota-comigo/shared-types";

import { apiPost } from "@/shared/lib/api-client";

import { executionValidation, type MatcherState } from "./matcher-state";

export function buildCompletionEvent(
  state: MatcherState,
): MatcherCompletionEvent {
  const validation = executionValidation(state);
  return {
    totalSelecionadas: validation.totalSelecionadas,
    totalRespondidas: validation.totalRespondidas,
  };
}

export function trackMatcherStarted(): void {
  track("matcher_started");
}

export function trackMatcherCompleted(event: MatcherCompletionEvent): void {
  track("matcher_completed", { ...event });
  void apiPost("/analytics/matcher-completion", event).catch(() => {});
}
