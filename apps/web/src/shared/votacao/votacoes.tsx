import type { VotacaoNominal } from "@vota-comigo/shared-types";

import { sortByDataDesc } from "./presentation";
import { VotacaoItem } from "./votacao-item";

export function Votacoes({ votacoes }: { votacoes: VotacaoNominal[] }) {
  const sorted = sortByDataDesc(votacoes);

  return (
    <div className="grid gap-3">
      <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
        Votações em plenário
      </h2>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">
          Nenhuma votação nominal em plenário registrada.
        </p>
      ) : (
        <ul>
          {sorted.map((votacao) => (
            <li key={votacao.externalIdVotacao}>
              <VotacaoItem votacao={votacao} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
