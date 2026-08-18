"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useMatcher } from "../matcher-provider";
import { getMatcherNavigationMethod } from "../../lib/matcher-navigation";
import {
  resolveMatcherRoute,
  type MatcherRoute,
} from "../../lib/matcher-route";

export function MatcherRouteGate({
  children,
  route,
}: {
  children: React.ReactNode;
  route: MatcherRoute;
}) {
  const router = useRouter();
  const { state } = useMatcher();
  const destination = resolveMatcherRoute(route, state);

  useEffect(() => {
    if (destination === route) return;
    router[getMatcherNavigationMethod("guard")](destination);
  }, [destination, route, router]);

  if (destination !== route) {
    return (
      <p aria-live="polite" className="text-sm text-muted" role="status">
        Retomando o passo possível…
      </p>
    );
  }

  return children;
}
