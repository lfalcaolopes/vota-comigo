"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/shared/ui";

import { hasRascunhoEntries } from "../../lib/matcher-rascunho";
import { getFurthestMatcherRoute } from "../../lib/matcher-route";
import { useMatcher } from "../matcher-provider";

export function MatcherIndex() {
  const router = useRouter();
  const { resetMatcher, state } = useMatcher();
  const destination = getFurthestMatcherRoute(state);
  const hasRascunho = hasRascunhoEntries(state);

  if (hasRascunho) {
    const totalRespondidas = state.selected.filter((proposicao) =>
      state.posicoes.has(proposicao.externalIdProposicao),
    ).length;

    return (
      <MatcherRascunhoChoice
        onResume={() => router.replace(destination)}
        onStartOver={() => {
          resetMatcher();
        }}
        siglaUf={state.siglaUf}
        totalRespondidas={totalRespondidas}
        totalSelecionadas={state.selected.length}
      />
    );
  }

  return <MatcherOnboarding onStart={() => router.replace("/matcher/local")} />;
}

export function MatcherOnboarding({ onStart }: { onStart: () => void }) {
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
          Compare suas posições com votos reais da Câmara
        </h1>
        <p className="max-w-[68ch] text-sm leading-normal text-muted">
          Na eleição, você faz uma escolha para deputado federal. Compare como
          diferentes deputados votaram em proposições que importam para você.
        </p>
      </header>

      <ol className="divide-y divide-border border-y border-border">
        <OnboardingStep
          description="Selecione pelo menos 3 proposições votadas pela Câmara."
          position={1}
          title="Escolha o que importa para você"
        />
        <OnboardingStep
          description='Diga se cada proposição deveria ser aprovada. Se não tiver uma posição, escolha "Não sei".'
          position={2}
          title="Declare suas posições"
        />
        <OnboardingStep
          description="Veja quais deputados votaram de forma semelhante e quantas votações sustentam cada compatibilidade."
          position={3}
          title="Compare com votos registrados"
        />
      </ol>

      <div className="grid gap-4">
        <p className="max-w-[68ch] text-sm leading-normal text-muted">
          O resultado considera apenas as proposições escolhidas e as votações
          comparáveis. Ele não é uma recomendação de voto.
        </p>
        <Button
          className="justify-self-start"
          onClick={onStart}
          variant="primary"
        >
          Começar comparação
        </Button>
      </div>
    </section>
  );
}

function OnboardingStep({
  description,
  position,
  title,
}: {
  description: string;
  position: number;
  title: string;
}) {
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-4 sm:py-5">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-primary-soft text-sm font-[680] tabular-nums text-ink"
      >
        {position}
      </span>
      <div className="grid gap-1 pt-1">
        <h2 className="text-base font-[680] leading-snug text-ink">{title}</h2>
        <p className="text-sm leading-normal text-muted">{description}</p>
      </div>
    </li>
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
          Suas escolhas continuam disponíveis nesta aba. Continue de onde parou
          ou comece uma nova comparação, apagando este rascunho.
        </p>
      </header>

      <div className="grid gap-5 rounded-lg bg-surface p-5 sm:p-6">
        <dl className="grid gap-2 text-sm sm:grid-cols-3 sm:gap-4">
          <RascunhoSummaryItem
            label="Estado"
            value={siglaUf ?? "Não informado"}
          />
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

function RascunhoSummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1">
      <dt className="text-muted">{label}</dt>
      <dd className="font-[680] text-ink">{value}</dd>
    </div>
  );
}
