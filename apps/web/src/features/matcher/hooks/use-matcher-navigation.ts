"use client";

import { useRouter } from "next/navigation";

import {
  getMatcherNavigationMethod,
  type MatcherNavigationIntent,
} from "../lib/matcher-navigation";
import type { MatcherRoute } from "../lib/matcher-route";

export function useMatcherNavigation() {
  const router = useRouter();

  return (route: MatcherRoute, intent: MatcherNavigationIntent = "step") => {
    router[getMatcherNavigationMethod(intent)](route);
  };
}
