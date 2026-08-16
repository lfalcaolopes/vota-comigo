"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type { MatcherRoute } from "../../lib/matcher-route";
import { MATCHER_STEP_LABELS } from "../../lib/matcher-step-labels";
import { StepIndicator } from "./step-indicator";

const STEP_DESCRIPTIONS: Record<MatcherRoute, string> = {
  "/matcher/local":
    "Começamos pelos deputados eleitos pelo seu estado. No resultado, dá para abrir para o Brasil inteiro.",
  "/matcher/proposicoes":
    "Escolha de 3 a 30 propostas. Com poucas, muitos deputados empatam; com mais, o resultado separa quem realmente vota como você.",
  "/matcher/posicoes":
    'Diga se cada proposta deveria ou não ser aprovada. Respostas "Não sei" ficam fora da conta.',
  "/matcher/resultado":
    "O percentual mostra em quantas das suas respostas o deputado votou como você, entre as que entraram na conta.",
};

export function MatcherStepFrame({
  children,
  description,
  route,
  title,
}: {
  children: ReactNode;
  description?: string;
  route: MatcherRoute;
  title?: string;
}) {
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    contentRef.current?.focus();
  }, []);

  return (
    <section
      className="grid gap-6 focus:outline-none lg:gap-8"
      ref={contentRef}
      tabIndex={-1}
    >
      <header className="mx-auto grid w-full max-w-6xl gap-2 lg:gap-3">
        <p className="text-sm font-[650] text-primary">Quem vota comigo</p>
        <h1 className="text-xl leading-tight font-[720] tracking-[-0.02em] text-ink sm:text-2xl">
          {title ?? MATCHER_STEP_LABELS[route]}
        </h1>
        <p className="max-w-[68ch] text-sm leading-normal text-muted">
          {description ?? STEP_DESCRIPTIONS[route]}
        </p>
        <StepIndicator currentRoute={route} />
      </header>
      {children}
    </section>
  );
}
