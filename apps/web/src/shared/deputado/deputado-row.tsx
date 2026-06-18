import type { DeputadoCard } from "@vota-comigo/shared-types";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/shared/ui";

import { DeputadoAvatar } from "./deputado-avatar";

type DeputadoRowProps = {
  card: DeputadoCard;
  href?: string;
};

export function DeputadoRow({ card, href }: DeputadoRowProps) {
  const content = <DeputadoRowContent card={card} />;

  if (href) {
    return (
      <article className="border-b border-border">
        <Link
          className="-mx-2 grid gap-3 rounded-md px-2 py-4 transition-[background-color] duration-[180ms] ease-standard hover:bg-surface focus-visible:bg-surface"
          href={href}
        >
          {content}
        </Link>
      </article>
    );
  }

  return (
    <article className="grid gap-3 border-b border-border py-4">
      {content}
    </article>
  );
}

function DeputadoRowContent({ card }: { card: DeputadoCard }) {
  const nome = card.nomePublico ?? "Nome não informado";

  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
      <DeputadoAvatar nome={card.nomePublico} urlFoto={card.urlFoto} />

      <div className="grid min-w-0 gap-2">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-[700] text-ink">{nome}</p>
            {card.nomeCivil ? (
              <p className="truncate text-sm text-subtle">
                Nome civil: {card.nomeCivil}
              </p>
            ) : null}
          </div>

          <Badge tone={card.emAtividade ? "success" : "neutral"}>
            {card.emAtividade ? "Em atividade" : "Fora de atividade"}
          </Badge>
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-2">
          <MetaItem label="Partido">
            {card.siglaPartido ?? "Partido não informado"}
          </MetaItem>
          <MetaItem label="UF">{card.siglaUf ?? "UF não informada"}</MetaItem>
        </dl>
      </div>
    </div>
  );
}

function MetaItem({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="text-sm font-semibold text-muted">{children}</dd>
    </div>
  );
}
