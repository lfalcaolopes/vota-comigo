import type { MatcherVotoDetalhe } from "@vota-comigo/shared-types";
import type { ReactNode } from "react";

import {
  formatShortDate,
  ProposicaoResumo,
  toIdentificadorLegislativo,
  toTextoResumo,
} from "@/shared/proposicao";
import { Badge, TitleLink } from "@/shared/ui";

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
    `Proposta ${proposicao.externalIdProposicao}`;
  const textoResumo = toTextoResumo(proposicao);
  const verdict = toMatcherEffectVerdict(matcherEffect);
  const dataVotacao = formatShortDate(voto.votacaoReferencia.data);

  return (
    <article className="grid gap-2 border-b border-border py-3">
      <div className="flex items-center justify-between gap-3">
        <TitleLink
          className="text-sm font-[650]"
          href={`/proposicoes/${proposicao.externalIdProposicao}`}
        >
          {identificador}
        </TitleLink>
        <Badge className="shrink-0" tone={verdict.tone}>
          {verdict.label}
        </Badge>
      </div>

      {textoResumo ? (
        <ProposicaoResumo identificador={identificador} texto={textoResumo} />
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
