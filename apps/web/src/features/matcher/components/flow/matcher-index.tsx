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
          Em vez de partir do nome do deputado, parta do que ele votou: escolha
          as propostas que importam para você, diga como votaria, e veja quem
          votou parecido.
        </p>
      </header>

      <ol className="divide-y divide-border border-y border-border">
        <OnboardingStep
          description="Escolha de 3 a 30 propostas já votadas pela Câmara. Quanto mais, mais firme fica a comparação."
          position={1}
          title="Comece pelos temas que te interessam"
        />
        <OnboardingStep
          description='Diga se cada proposta deveria ser aprovada. "Não sei" é uma resposta válida, mas ela sai da conta: a comparação usa só o que você respondeu Sim ou Não.'
          position={2}
          title="Declare suas posições"
        />
        <OnboardingStep
          description="Você vê quais deputados votaram como você e de onde vem cada percentual."
          position={3}
          title="Veja o resultado completo"
        />
      </ol>

      <div className="grid gap-4">
        <p className="max-w-[68ch] text-sm leading-normal text-muted">
          Nada aqui é recomendação de voto: comparamos votos registrados em
          plenário e mostramos o que entrou em cada conta. O resultado cobre só
          as propostas que você escolher.
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
          Suas escolhas continuam disponíveis nesta aba. Você pode continuar de
          onde parou ou recomeçar do zero. Recomeçar apaga o que você já
          respondeu.
        </p>
      </header>

      <div className="grid gap-5 rounded-lg bg-surface p-5 sm:p-6">
        <dl className="grid gap-2 text-sm sm:grid-cols-3 sm:gap-4">
          <RascunhoSummaryItem
            label="Estado escolhido"
            value={siglaUf ?? "Não informado"}
          />
          <RascunhoSummaryItem
            label="Propostas escolhidas"
            value={String(totalSelecionadas)}
          />
          <RascunhoSummaryItem
            label="Posições respondidas"
            value={String(totalRespondidas)}
          />
        </dl>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onResume} variant="primary">
            Continuar de onde parei
          </Button>
          <Button onClick={onStartOver} variant="secondary">
            Recomeçar do zero
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
