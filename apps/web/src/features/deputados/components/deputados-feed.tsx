import type {
  DeputadoCard,
  PartidoDisponivel,
  UfDisponivel,
} from "@vota-comigo/shared-types";

import type { DeputadoFeedFiltros } from "@/shared/deputado";

import { DeputadosFeedView } from "./deputados-feed-view";

type DeputadosFeedProps = {
  initialItems: DeputadoCard[];
  total: number;
  initialQuery?: string | null;
  initialFiltros?: DeputadoFeedFiltros;
  ufs?: readonly UfDisponivel[];
  partidos?: readonly PartidoDisponivel[];
};

export function DeputadosFeed({
  initialItems,
  total,
  initialQuery,
  initialFiltros,
  ufs,
  partidos,
}: DeputadosFeedProps) {
  return (
    <section>
      <header className="mb-10 grid max-w-[68ch] gap-4">
        <p className="text-sm font-[650] text-primary">Câmara dos Deputados</p>
        <h1 className="text-3xl leading-tight font-[720] text-balance text-ink">
          Deputados
        </h1>
      </header>

      <DeputadosFeedView
        initialFiltros={initialFiltros}
        initialItems={initialItems}
        initialQuery={initialQuery}
        initialTotal={total}
        ufs={ufs}
        partidos={partidos}
      />
    </section>
  );
}
