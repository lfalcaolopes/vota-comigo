import type { MatcherVotoDetalhe } from "@vota-comigo/shared-types";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  formatShortDate,
  toIdentificadorLegislativo,
} from "@/shared/proposicao";
import { Badge } from "@/shared/ui";

import {
  toMatcherEffectVerdict,
  toPosicaoLabel,
  toSituacaoLabel,
} from "../../lib/matcher-detalhe-presentation";

type VotoDetalheItemProps = {
  voto: MatcherVotoDetalhe;
};

export function VotoDetalheItem({ voto }: VotoDetalheItemProps) {
  const { proposicao, posicaoUsuario, situacaoDeputadoVotacao, matcherEffect } =
    voto;

  const identificador =
    toIdentificadorLegislativo(proposicao) ??
    `Proposição ${proposicao.externalIdProposicao}`;
  const verdict = toMatcherEffectVerdict(matcherEffect);
  const dataVotacao = formatShortDate(voto.votacaoReferencia.data);

  return (
    <article className="border-b border-border">
      <Link
        className="-mx-2 grid gap-2 rounded-md px-2 py-3 transition-[background-color] duration-[180ms] ease-standard hover:bg-surface focus-visible:bg-surface"
        href={`/proposicoes/${proposicao.externalIdProposicao}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-[650] text-ink">{identificador}</p>
          <Badge className="shrink-0" tone={verdict.tone}>
            {verdict.label}
          </Badge>
        </div>

        {proposicao.ementa ? (
          <p className="line-clamp-2 text-sm leading-normal text-muted">
            {proposicao.ementa}
          </p>
        ) : null}

        <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <MetaItem label="Sua posição">
            {toPosicaoLabel(posicaoUsuario)}
          </MetaItem>
          <MetaItem label="Deputado votou">
            {toSituacaoLabel(situacaoDeputadoVotacao)}
          </MetaItem>
          {dataVotacao ? (
            <MetaItem label="Votação" mono>
              {dataVotacao}
            </MetaItem>
          ) : null}
        </dl>
      </Link>
    </article>
  );
}

function MetaItem({
  children,
  label,
  mono = false,
}: {
  children: ReactNode;
  label: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <dt className="text-muted">{label}</dt>
      <dd
        className={
          mono ? "font-mono font-medium text-muted" : "font-[650] text-ink"
        }
      >
        {children}
      </dd>
    </div>
  );
}
