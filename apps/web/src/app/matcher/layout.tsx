import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  MatcherHydrationGate,
  MatcherProvider,
  MatcherRouteAnalytics,
} from "@/features/matcher";

export const metadata: Metadata = {
  title: "Fazer comparação",
  description:
    "Declare sua posição sobre as proposições mais votadas e descubra quais deputados federais votaram de forma compatível com você.",
};

export default function MatcherLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-clip bg-bg text-ink">
      <div className="mx-auto box-border w-full min-w-0 max-w-6xl px-4 pt-8 pb-16 md:pt-12">
        <MatcherProvider>
          <MatcherHydrationGate>
            <MatcherRouteAnalytics />
            {children}
          </MatcherHydrationGate>
        </MatcherProvider>
      </div>
    </main>
  );
}
