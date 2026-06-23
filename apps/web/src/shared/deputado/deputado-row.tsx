import type { DeputadoCard } from "@vota-comigo/shared-types";
import Link from "next/link";

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

      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 min-h-10 max-w-[13rem] text-base font-[700] leading-5 text-ink sm:line-clamp-none sm:min-h-0 sm:max-w-none sm:truncate sm:leading-normal">
            {nome}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {card.siglaPartido ?? "Partido não informado"} ·{" "}
            {card.siglaUf ?? "UF não informada"}
          </p>
        </div>

        <Badge
          className="shrink-0"
          tone={card.emAtividade ? "success" : "neutral"}
        >
          {card.emAtividade ? "Em atividade" : "Fora de atividade"}
        </Badge>
      </div>
    </div>
  );
}
