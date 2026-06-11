import type { MatcherVotoDetalhe } from "@vota-comigo/shared-types";

import {
  toPosicaoLabel,
  toSituacaoLabel,
} from "../lib/matcher-detalhe-presentation";

type VotoDetalheItemProps = {
  voto: MatcherVotoDetalhe;
};

export function VotoDetalheItem({ voto }: VotoDetalheItemProps) {
  const { proposicao, posicaoUsuario, situacaoDeputadoVotacao } = voto;

  const identificador = [proposicao.siglaTipo, proposicao.numero, proposicao.ano]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-1 border-b border-border py-3">
      <p className="text-sm font-[650] text-ink">
        {identificador || `Proposição ${proposicao.externalIdProposicao}`}
      </p>
      {proposicao.ementa && (
        <p className="line-clamp-2 text-sm leading-normal text-muted">
          {proposicao.ementa}
        </p>
      )}
      <div className="mt-1 flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
            <circle cx="6" cy="6" fill="currentColor" opacity="0.4" r="5" />
            <path
              d="M3.5 6l2 2 3-3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
          <span className="text-muted">Sua posição:</span>
          <span className="font-[650] text-ink">{toPosicaoLabel(posicaoUsuario)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
            <rect fill="currentColor" height="8" opacity="0.4" rx="1" width="8" x="2" y="2" />
            <path
              d="M4.5 6h3M6 4.5v3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
          </svg>
          <span className="text-muted">Deputado votou:</span>
          <span className="font-[650] text-ink">
            {toSituacaoLabel(situacaoDeputadoVotacao)}
          </span>
        </span>
      </div>
    </div>
  );
}
