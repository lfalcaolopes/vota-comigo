import { track } from "@vercel/analytics";
import type { MatcherCompletionEvent } from "@vota-comigo/shared-types";

import { readFirstTouchAttribution } from "@/shared/analytics";
import { apiPost } from "@/shared/lib/api-client";

import { executionValidation, type MatcherState } from "./matcher-state";

export function buildCompletionEvent(
  state: MatcherState,
): MatcherCompletionEvent {
  const validation = executionValidation(state);
  return {
    totalSelecionadas: validation.totalSelecionadas,
    totalRespondidas: validation.totalRespondidas,
    ...readFirstTouchAttribution(),
  };
}

export function trackMatcherStarted(): void {
  track("matcher_started");
  void apiPost("/analytics/matcher-start", readFirstTouchAttribution()).catch(
    () => {},
  );
}

export function trackMatcherCompleted(event: MatcherCompletionEvent): void {
  track("matcher_completed", {
    totalSelecionadas: event.totalSelecionadas,
    totalRespondidas: event.totalRespondidas,
  });
  void apiPost("/analytics/matcher-completion", event).catch(() => {});
}
