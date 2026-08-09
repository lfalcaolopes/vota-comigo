"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/shared/ui";

import { getMatcherNavigationMethod } from "../../lib/matcher-navigation";
import { hasRascunhoEntries } from "../../lib/matcher-rascunho";
import { getFurthestMatcherRoute } from "../../lib/matcher-route";
import { useMatcher } from "../matcher-provider";

export function MatcherIndex() {
  const router = useRouter();
  const { resetMatcher, state } = useMatcher();
  const destination = getFurthestMatcherRoute(state);
  const hasRascunho = hasRascunhoEntries(state);

  useEffect(() => {
    if (!hasRascunho) {
      router[getMatcherNavigationMethod("guard")]("/matcher/local");
    }
  }, [hasRascunho, router]);

  if (hasRascunho) {
    const totalRespondidas = state.selected.filter((proposicao) =>
      state.posicoes.has(proposicao.externalIdProposicao),
    ).length;

    return (
      <MatcherRascunhoChoice
        onResume={() => router.replace(destination)}
        onStartOver={() => {
          resetMatcher();
          router.replace("/matcher/local");
        }}
        siglaUf={state.siglaUf}
        totalRespondidas={totalRespondidas}
        totalSelecionadas={state.selected.length}
      />
    );
  }

  return (
    <p aria-live="polite" className="text-sm text-muted" role="status">
      Iniciando uma nova comparação…
    </p>
  );
}

export function MatcherRascunhoChoice({
  onResume,
  onStartOver,
  siglaUf,
  totalRespondidas,
  totalSelecionadas,
}: {
  onResume: () => void;
  onStartOver: () => void;
  siglaUf: string | null;
  totalRespondidas: number;
  totalSelecionadas: number;
}) {
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    contentRef.current?.focus();
  }, []);

  return (
    <section
      className="mx-auto grid w-full max-w-2xl gap-6 focus:outline-none"
      ref={contentRef}
      tabIndex={-1}
    >
      <header className="grid gap-2">
        <p className="text-sm font-[650] text-primary">Quem vota comigo</p>
        <h1 className="text-xl leading-tight font-[720] tracking-[-0.02em] text-ink sm:text-2xl">
          Você tem uma comparação em andamento
        </h1>
        <p className="max-w-[68ch] text-sm leading-normal text-muted">
          Suas escolhas continuam disponíveis nesta aba. Continue de onde
          parou ou comece uma nova comparação, apagando este rascunho.
        </p>
      </header>

      <div className="grid gap-5 rounded-lg bg-surface p-5 sm:p-6">
        <dl className="grid gap-2 text-sm sm:grid-cols-3 sm:gap-4">
          <RascunhoSummaryItem label="Estado" value={siglaUf ?? "Não informado"} />
          <RascunhoSummaryItem
            label="Proposições escolhidas"
            value={String(totalSelecionadas)}
          />
          <RascunhoSummaryItem
            label="Posições respondidas"
            value={String(totalRespondidas)}
          />
        </dl>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onResume} variant="primary">
            Continuar comparação
          </Button>
          <Button onClick={onStartOver} variant="secondary">
            Começar nova comparação
          </Button>
        </div>
      </div>
    </section>
  );
}

function RascunhoSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-muted">{label}</dt>
      <dd className="font-[680] text-ink">{value}</dd>
    </div>
  );
}
