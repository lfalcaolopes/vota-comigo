import type { VotacaoNominal } from "@vota-comigo/shared-types";

import { sortByDataDesc } from "./presentation";
import { VotacaoItem } from "./votacao-item";

const VISIBLE_COUNT = 3;

export function Votacoes({ votacoes }: { votacoes: VotacaoNominal[] }) {
  const sorted = sortByDataDesc(votacoes);
  const visiveis = sorted.slice(0, VISIBLE_COUNT);
  const restantes = sorted.slice(VISIBLE_COUNT);

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
        <div>
          <VotacaoLista votacoes={visiveis} />
          {restantes.length > 0 ? (
            <details className="group">
              <summary className="mt-3 flex min-h-11 cursor-pointer list-none items-center justify-center gap-1.5 rounded-md border border-border text-sm font-[650] text-muted transition-colors duration-[140ms] ease-standard group-open:hidden hover:border-border-strong hover:text-ink [&::-webkit-details-marker]:hidden">
                Mostrar todas ({sorted.length})
                <ChevronIcon />
              </summary>
              <VotacaoLista votacoes={restantes} />
            </details>
          ) : null}
        </div>
      )}
    </div>
  );
}

function VotacaoLista({ votacoes }: { votacoes: VotacaoNominal[] }) {
  return (
    <ul>
      {votacoes.map((votacao) => (
        <li key={votacao.externalIdVotacao}>
          <VotacaoItem votacao={votacao} />
        </li>
      ))}
    </ul>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m5 7.5 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
