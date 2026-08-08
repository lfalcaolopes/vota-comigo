"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type { MatcherRoute } from "../../lib/matcher-route";
import { StepIndicator } from "./step-indicator";

const STEP_LABELS: Record<MatcherRoute, string> = {
  "/matcher/local": "Onde você vota",
  "/matcher/proposicoes": "Escolha proposições",
  "/matcher/posicoes": "Sua posição",
  "/matcher/resultado": "Quem vota com você",
};

const STEP_DESCRIPTIONS: Record<MatcherRoute, string> = {
  "/matcher/local":
    "Informe seu estado para priorizar deputados da sua UF nos resultados. A cidade é opcional e não entra no cálculo.",
  "/matcher/proposicoes":
    "Escolha de 3 a 30 proposições. Quanto mais temas você incluir, mais o resultado consegue diferenciar deputados com históricos de votação parecidos.",
  "/matcher/posicoes":
    'Diga se cada proposição deveria ou não ser aprovada. Respostas "Não sei" ficam fora do cálculo.',
  "/matcher/resultado":
    "A compatibilidade mostra em quantas votações comparáveis o deputado votou de acordo com suas posições.",
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
          {title ?? STEP_LABELS[route]}
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
