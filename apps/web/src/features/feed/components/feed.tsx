import type { ProposicaoCard } from "@vota-comigo/shared-types";

import { FeedView } from "./feed-view";

type FeedProps = {
  initialItems: ProposicaoCard[];
  total: number;
};

export function Feed({ initialItems, total }: FeedProps) {
  return (
    <section>
      <header className="mb-10 grid max-w-[68ch] gap-4">
        <p className="text-sm font-[650] text-primary">Câmara dos Deputados</p>
        <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
          Proposições mais votadas em plenário
        </h1>
        <p className="text-lg leading-normal text-pretty text-muted">
          Ordenadas pelo número de votações nominais em plenário, a partir dos
          dados abertos oficiais da Câmara.
        </p>
      </header>

      <FeedView initialItems={initialItems} initialTotal={total} />
    </section>
  );
}
