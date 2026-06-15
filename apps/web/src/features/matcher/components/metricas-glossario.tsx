import type { ReactNode } from "react";

export function MetricasGlossario() {
  return (
    <details className="group text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-[650] text-muted [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-180"
          fill="none"
          height="16"
          viewBox="0 0 16 16"
          width="16"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
        <span>O que estes números significam</span>
      </summary>
      <dl className="mt-3 grid gap-3 leading-normal text-muted">
        <Definicao termo="Votações comparáveis">
          Votações em que o deputado registrou um voto que pôde ser comparado à sua
          posição. É a base do cálculo de compatibilidade.
        </Definicao>
        <Definicao termo="Compatibilidade">
          Porcentagem das votações comparáveis em que o voto do deputado coincidiu
          com a sua posição.
        </Definicao>
        <Definicao termo="Cobertura de exercício">
          Votações, entre as que você selecionou, em que o deputado estava em
          exercício e podia votar.
        </Definicao>
      </dl>
    </details>
  );
}

function Definicao({ termo, children }: { termo: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="font-[650] text-ink">{termo}</dt>
      <dd>{children}</dd>
    </div>
  );
}
