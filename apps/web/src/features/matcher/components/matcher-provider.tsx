"use client";

import { createContext, useContext, type ReactNode } from "react";

import { Skeleton } from "@/shared/ui";

import { useMatcherState } from "../hooks/use-matcher-state";

type MatcherContextValue = ReturnType<typeof useMatcherState>;
type MatcherProviderProps = { children: ReactNode };

const MatcherContext = createContext<MatcherContextValue | null>(null);

export function MatcherProvider({ children }: MatcherProviderProps) {
  const matcher = useMatcherState();

  return (
    <MatcherContext.Provider value={matcher}>
      {children}
    </MatcherContext.Provider>
  );
}

export function useMatcher(): MatcherContextValue {
  const matcher = useContext(MatcherContext);
  if (matcher === null) {
    throw new Error("useMatcher must be used within MatcherProvider");
  }
  return matcher;
}

export function MatcherHydrationGate({ children }: { children: ReactNode }) {
  const matcher = useMatcher();

  if (!matcher.isHydrated) return <MatcherHydrationStatus />;
  return children;
}

function MatcherHydrationStatus() {
  return (
    <section aria-live="polite" className="grid gap-6 lg:gap-8" role="status">
      <span className="sr-only">Recuperando suas escolhas desta aba</span>
      <header className="mx-auto grid w-full max-w-6xl gap-2 lg:gap-3">
        <Skeleton className="h-4 w-36 rounded-full" />
        <Skeleton className="h-7 w-56 rounded-md" />
        <Skeleton className="h-4 w-full max-w-xl rounded-full" />
        <div aria-hidden="true" className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="h-7 w-28 rounded-full" key={index} />
          ))}
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl">
        <div className="grid w-full max-w-2xl gap-5">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
          <Skeleton className="h-11 w-28 rounded-md" />
        </div>
      </div>
    </section>
  );
}
