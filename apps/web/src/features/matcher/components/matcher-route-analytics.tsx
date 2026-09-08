"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  buildCompletionEvent,
  shouldTrackMatcherCompletion,
  trackMatcherCompleted,
  trackMatcherStarted,
} from "../lib/matcher-analytics";
import { useMatcher } from "./matcher-provider";

export function MatcherRouteAnalytics() {
  const pathname = usePathname();
  const { state, trackCompletion } = useMatcher();
  const hasTrackedStartRef = useRef(false);

  useEffect(() => {
    if (hasTrackedStartRef.current) return;
    if (pathname === "/matcher" || pathname === "/matcher/local") return;
    hasTrackedStartRef.current = true;
    trackMatcherStarted();
  }, [pathname]);

  useEffect(() => {
    if (!shouldTrackMatcherCompletion(pathname, state)) return;
    trackCompletion();
    trackMatcherCompleted(buildCompletionEvent(state));
  }, [pathname, state, trackCompletion]);

  return null;
}
