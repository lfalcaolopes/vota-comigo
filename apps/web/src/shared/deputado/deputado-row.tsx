import type { DeputadoCard } from "@vota-comigo/shared-types";
import Link from "next/link";

import { Badge, CheckboxControl } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

import { DeputadoAvatar } from "./deputado-avatar";

type DeputadoRowSelection = {
  disabled: boolean;
  onToggle: (externalIdDeputado: number) => void;
  selected: boolean;
};

type DeputadoRowProps = {
  card: DeputadoCard;
  href?: string;
  selection?: DeputadoRowSelection;
};

export function DeputadoRow({ card, href, selection }: DeputadoRowProps) {
  const content = <DeputadoRowContent card={card} selection={selection} />;

  if (selection) {
    return (
      <div className="border-b border-border">
        <label
          aria-disabled={selection.disabled}
          className={joinClassNames(
            "-mx-2 grid cursor-pointer gap-3 rounded-md px-2 py-4 transition-[background-color] duration-[180ms] ease-standard hover:bg-surface has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
            selection.disabled && "cursor-not-allowed opacity-55",
          )}
        >
          {content}
        </label>
      </div>
    );
  }

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

function DeputadoRowContent({
  card,
  selection,
}: {
  card: DeputadoCard;
  selection?: DeputadoRowSelection;
}) {
  const nome = card.nomePublico ?? "Nome não informado";

  return (
    <div
      className={joinClassNames(
        "grid min-w-0 gap-3",
        selection
          ? "grid-cols-[auto_auto_minmax(0,1fr)] items-center"
          : "grid-cols-[auto_minmax(0,1fr)]",
      )}
    >
      {selection ? (
        <CheckboxControl
          aria-label={`Selecionar ${nome} para comparação`}
          checked={selection.selected}
          disabled={selection.disabled}
          onChange={() => selection.onToggle(card.externalIdDeputado)}
        />
      ) : null}

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
