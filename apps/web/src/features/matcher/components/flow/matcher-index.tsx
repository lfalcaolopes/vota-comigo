"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getMatcherNavigationMethod } from "../../lib/matcher-navigation";
import { getFurthestMatcherRoute } from "../../lib/matcher-route";
import { useMatcher } from "../matcher-provider";

export function MatcherIndex() {
  const router = useRouter();
  const { state } = useMatcher();
  const destination = getFurthestMatcherRoute(state);

  useEffect(() => {
    router[getMatcherNavigationMethod("guard")](destination);
  }, [destination, router]);

  return (
    <p aria-live="polite" className="text-sm text-muted" role="status">
      Retomando suas escolhas…
    </p>
  );
}
