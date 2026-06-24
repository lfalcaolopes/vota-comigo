import type { ProposicaoCard } from "@vota-comigo/shared-types";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, SparklesIcon } from "../ui";
import {
  formatShortDate,
  isResumoIaCard,
  toAnoApresentacao,
  toIdentificadorLegislativo,
  toTextoResumo,
} from "./presentation";

type ProposicaoRowProps = {
  card: ProposicaoCard;
  href?: string;
};

export function ProposicaoRow({ card, href }: ProposicaoRowProps) {
  const content = <ProposicaoRowContent card={card} />;

  if (href) {
    return (
      <article className="border-b border-border">
        <Link
          className="-mx-2 grid gap-2 rounded-md px-2 py-4 transition-[background-color] duration-[180ms] ease-standard hover:bg-surface focus-visible:bg-surface"
          href={href}
        >
          {content}
        </Link>
      </article>
    );
  }

  return (
    <article className="grid gap-2 border-b border-border py-4">
      {content}
    </article>
  );
}

function ProposicaoRowContent({ card }: { card: ProposicaoCard }) {
  const identificador = toIdentificadorLegislativo(card);
  const ultimaVotacao = formatShortDate(card.dataUltimaVotacao);
  const anoApresentacao = toAnoApresentacao(card);
  const textoResumo = toTextoResumo(card);
  const resumoIa = isResumoIaCard(card);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-sm font-[650] tracking-[-0.01em] text-ink">
          {identificador ?? "Sem identificador"}
        </p>

        {resumoIa ? (
          <Badge className="shrink-0" tone="neutral">
            <SparklesIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-primary"
            />
            Resumo por IA
          </Badge>
        ) : null}
      </div>

      {textoResumo ? (
        <p className="line-clamp-2 text-base leading-snug text-pretty text-muted">
          {textoResumo}
        </p>
      ) : null}

      <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
        <MetaItem label="Votações em plenário">
          {card.volumeVotacoesPlenario}
        </MetaItem>

        {ultimaVotacao ? (
          <MetaItem className="hidden sm:flex" label="Última votação" mono>
            {ultimaVotacao}
          </MetaItem>
        ) : null}

        {anoApresentacao != null ? (
          <MetaItem label="Apresentada" mono>
            {anoApresentacao}
          </MetaItem>
        ) : null}
      </dl>
    </>
  );
}

function MetaItem({
  children,
  label,
  mono = false,
  className,
}: {
  children: ReactNode;
  label: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-0 items-baseline gap-2${className ? ` ${className}` : ""}`}
    >
      <dt className="text-xs text-subtle">{label}</dt>
      <dd
        className={
          mono
            ? "font-mono text-sm font-medium text-muted"
            : "text-sm font-semibold text-muted"
        }
      >
        {children}
      </dd>
    </div>
  );
}
