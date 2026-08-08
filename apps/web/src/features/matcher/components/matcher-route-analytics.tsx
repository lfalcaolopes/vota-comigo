"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  buildCompletionEvent,
  trackMatcherCompleted,
  trackMatcherStarted,
} from "../lib/matcher-analytics";
import { resultadoDisplay } from "../lib/matcher-state";
import { useMatcher } from "./matcher-provider";

export function MatcherRouteAnalytics() {
  const pathname = usePathname();
  const { state } = useMatcher();
  const hasTrackedStartRef = useRef(false);
  const hasTrackedCompletionRef = useRef(false);

  useEffect(() => {
    if (hasTrackedStartRef.current) return;
    if (pathname === "/matcher" || pathname === "/matcher/local") return;
    hasTrackedStartRef.current = true;
    trackMatcherStarted();
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/matcher/resultado") {
      hasTrackedCompletionRef.current = false;
      return;
    }
    if (hasTrackedCompletionRef.current) return;
    if (resultadoDisplay(state) !== "results") return;
    hasTrackedCompletionRef.current = true;
    trackMatcherCompleted(buildCompletionEvent(state));
  }, [pathname, state]);

  return null;
}
