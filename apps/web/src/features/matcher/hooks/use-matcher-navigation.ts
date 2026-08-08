"use client";

import { useRouter } from "next/navigation";

import {
  getMatcherNavigationMethod,
  type MatcherNavigationIntent,
} from "../lib/matcher-navigation";
import type { MatcherHref } from "../lib/matcher-route";

export function useMatcherNavigation() {
  const router = useRouter();

  return (route: MatcherHref, intent: MatcherNavigationIntent = "step") => {
    router[getMatcherNavigationMethod(intent)](route);
  };
}
