import type { ProposicaoCard } from "@vota-comigo/shared-types";

import {
  formatShortDate,
  toAnoApresentacao,
  toIdentificadorLegislativo,
} from "./presentation";

export function ProposicaoRow({ card }: { card: ProposicaoCard }) {
  const identificador = toIdentificadorLegislativo(card);
  const ultimaVotacao = formatShortDate(card.dataUltimaVotacao);
  const anoApresentacao = toAnoApresentacao(card);

  return (
    <article className="grid gap-2 border-b border-border py-4">
      <p className="font-mono text-sm font-[650] tracking-[-0.01em] text-ink">
        {identificador ?? "Sem identificador"}
      </p>

      {card.ementa ? (
        <p className="line-clamp-2 text-base leading-snug text-pretty text-muted">
          {card.ementa}
        </p>
      ) : null}

      <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
        <MetaItem label="Votações em plenário">
          {card.volumeVotacoesPlenario}
        </MetaItem>

        {ultimaVotacao ? (
          <MetaItem label="Última votação" mono>
            {ultimaVotacao}
          </MetaItem>
        ) : null}

        {anoApresentacao != null ? (
          <MetaItem label="Apresentada" mono>
            {anoApresentacao}
          </MetaItem>
        ) : null}
      </dl>
    </article>
  );
}

function MetaItem({
  children,
  label,
  mono = false,
}: {
  children: React.ReactNode;
  label: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
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
