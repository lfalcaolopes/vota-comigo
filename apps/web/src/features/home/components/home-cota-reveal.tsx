"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { formatGastoCotaAmount } from "@/shared/deputado";

type RevealPhase = "static" | "pending" | "playing";

const RevealPhaseContext = createContext<RevealPhase>("static");

// Um gatilho só para o total e para as barras: com um observer em cada, o total
// termina de contar enquanto as barras, mais abaixo, ainda esperam a própria
// entrada em tela.
export function CotaRevealScope({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { phase, ref } = useRevealOnEnter<HTMLDivElement>();

  return (
    <RevealPhaseContext.Provider value={phase}>
      <div
        className={className}
        data-reveal={phase === "static" ? undefined : phase}
        ref={ref}
      >
        {children}
      </div>
    </RevealPhaseContext.Provider>
  );
}

export function CotaTotalReveal({
  totalAmountUsedCents,
  durationMs,
}: {
  totalAmountUsedCents: number;
  durationMs: number;
}) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const phase = useContext(RevealPhaseContext);

  useEffect(() => {
    const node = valueRef.current;
    // Em "pending" o total continua no valor final: um número errado parado na
    // tela é pior do que o pulo de um frame quando a contagem começa.
    if (node === null || phase !== "playing") return;

    return animateCount(node, totalAmountUsedCents, durationMs);
  }, [durationMs, phase, totalAmountUsedCents]);

  const formatted = formatGastoCotaAmount(totalAmountUsedCents);

  return (
    <p className="text-[2rem] leading-none font-[730] tracking-[-0.02em] tabular-nums text-ink md:text-[2.25rem]">
      <span aria-hidden="true" ref={valueRef}>
        {formatted}
      </span>
      <span className="sr-only">{formatted}</span>
    </p>
  );
}

function useRevealOnEnter<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [phase, setPhase] = useState<RevealPhase>("static");

  useEffect(() => {
    const node = ref.current;
    // Revelar o que o leitor já leu seria apagar e redesenhar na frente dele;
    // nesse caso o estado final do SSR é o certo.
    if (node === null || prefersReducedMotion() || isSettled(node)) return;

    setPhase("pending");

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setPhase("playing");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return { phase, ref };
}

function animateCount(
  node: HTMLElement,
  amountUsedCents: number,
  durationMs: number,
): () => void {
  const startedAt = performance.now();

  function step(now: number): void {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    node.textContent = formatGastoCotaAmount(
      toPartialAmount(amountUsedCents, progress),
    );
    if (progress < 1) frame = requestAnimationFrame(step);
  }

  let frame = requestAnimationFrame(step);

  return () => cancelAnimationFrame(frame);
}

// Centavo em movimento é ruído, não leitura: só os reais correm e a fração
// fica parada no valor final.
function toPartialAmount(amountUsedCents: number, progress: number): number {
  if (progress >= 1) return amountUsedCents;

  const eased = 1 - (1 - progress) ** 2;
  return (
    Math.round((amountUsedCents * eased) / 100) * 100 + (amountUsedCents % 100)
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isSettled(node: HTMLElement): boolean {
  return node.getBoundingClientRect().bottom <= window.innerHeight * 0.75;
}
