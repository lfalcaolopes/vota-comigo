import type { DeputadoCard, UfDisponivel } from "@vota-comigo/shared-types";

import { DeputadosFeedView } from "./deputados-feed-view";

type DeputadosFeedProps = {
  initialItems: DeputadoCard[];
  total: number;
  initialQuery?: string | null;
  initialEmAtividade?: boolean;
  initialUf?: string | null;
  ufs?: readonly UfDisponivel[];
};

export function DeputadosFeed({
  initialItems,
  total,
  initialQuery,
  initialEmAtividade,
  initialUf,
  ufs,
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
        initialEmAtividade={initialEmAtividade}
        initialItems={initialItems}
        initialQuery={initialQuery}
        initialTotal={total}
        initialUf={initialUf}
        ufs={ufs}
      />
    </section>
  );
}
