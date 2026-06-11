import type { MatcherEffect, MatcherVotoDetalhe } from "@vota-comigo/shared-types";

import {
  FORA_DO_DENOMINADOR_EXPLICACAO,
  toMatcherEffectLabel,
} from "../lib/matcher-detalhe-presentation";
import { VotoDetalheItem } from "./voto-detalhe-item";

type VotoGrupoProps = {
  effect: MatcherEffect;
  votos: MatcherVotoDetalhe[];
};

export function VotoGrupo({ effect, votos }: VotoGrupoProps) {
  if (votos.length === 0) return null;

  return (
    <section className="grid gap-1">
      <h3 className="text-base font-[680] text-ink">
        {toMatcherEffectLabel(effect)}
        <span className="ml-2 text-sm font-normal text-muted">({votos.length})</span>
      </h3>
      {effect === "fora_do_denominador" && (
        <p className="text-sm leading-normal text-muted">
          {FORA_DO_DENOMINADOR_EXPLICACAO}
        </p>
      )}
      <div className="mt-1">
        {votos.map((voto) => (
          <VotoDetalheItem
            key={voto.votacaoReferencia.externalIdVotacao}
            voto={voto}
          />
        ))}
      </div>
    </section>
  );
}
