import type { DeputadoCard } from "@vota-comigo/shared-types";
import Link from "next/link";

import { Badge, CheckboxControl, ChevronDownIcon } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

import { DeputadoAvatar } from "./deputado-avatar";
import { toDiasEmExercicioLabel, toUsoCotaPeriodoLabel } from "./presentation";

type DeputadoRowSelection = {
  disabled: boolean;
  onToggle: (externalIdDeputado: number) => void;
  selected: boolean;
};

type DeputadoRowProps = {
  card: DeputadoCard;
  href?: string;
  selection?: DeputadoRowSelection;
  showUsoCota?: boolean;
};

export function DeputadoRow({
  card,
  href,
  selection,
  showUsoCota,
}: DeputadoRowProps) {
  const content = (
    <DeputadoRowContent
      card={card}
      linked={href !== undefined && selection === undefined}
      selection={selection}
      showUsoCota={showUsoCota}
    />
  );

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
          className="-mx-2 grid gap-3 rounded-md px-2 py-4 transition-[background-color] duration-[180ms] ease-standard hover:bg-surface focus-visible:bg-surface active:bg-surface"
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
  linked,
  selection,
  showUsoCota,
}: {
  card: DeputadoCard;
  linked: boolean;
  selection?: DeputadoRowSelection;
  showUsoCota?: boolean;
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

      <div
        className={joinClassNames(
          "grid min-w-0 gap-x-3 gap-y-2",
          linked
            ? "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto]"
            : "grid-cols-[minmax(0,1fr)_auto]",
        )}
      >
        <div className="col-start-1 row-start-1 min-w-0">
          <p className="line-clamp-2 text-base font-[700] leading-5 text-ink sm:line-clamp-none sm:truncate sm:leading-normal">
            {nome}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {card.siglaPartido ?? "Partido não informado"} ·{" "}
            {card.siglaUf ?? "UF não informada"}
          </p>
          {showUsoCota ? (
            card.usoCota?.status === "calculavel" ? (
              <div className="mt-1 grid gap-0.5">
                <p className="text-sm font-[650] text-ink">
                  Uso da cota: {Math.round(card.usoCota.percentualTetoBase)}%
                </p>
                <p className="text-xs leading-normal text-muted">
                  {toUsoCotaPeriodoLabel(card.usoCota)} ·{" "}
                  {toDiasEmExercicioLabel(card.usoCota.diasEmExercicio)}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-sm font-[650] text-ink">
                Uso da cota indisponível
              </p>
            )
          ) : null}
        </div>

        {/* With the cota lines, phones drop the badge under the text so those lines keep the full width. */}
        <Badge
          className={
            showUsoCota
              ? "col-start-1 row-start-2 self-start justify-self-start sm:col-start-2 sm:row-start-1 sm:justify-self-end"
              : "col-start-2 row-start-1 self-start justify-self-end"
          }
          tone={card.emAtividade ? "success" : "neutral"}
        >
          {card.emAtividade ? "Em exercício" : "Fora de exercício"}
        </Badge>
        {linked ? (
          <ChevronDownIcon
            aria-hidden="true"
            className={joinClassNames(
              "col-start-2 row-start-1 -rotate-90 text-primary sm:col-start-3 sm:row-end-2 sm:self-center sm:justify-self-auto",
              showUsoCota
                ? "row-end-3 self-center"
                : "self-end justify-self-end",
            )}
          />
        ) : null}
      </div>
    </div>
  );
}
