import type {
  FeedOrdenacao,
  ProposicaoCard,
  TemaDisponivel,
} from "@vota-comigo/shared-types";

import { FeedView } from "./feed-view";

type FeedProps = {
  initialItems: ProposicaoCard[];
  total: number;
  initialOrdenacao?: FeedOrdenacao;
  initialQuery?: string | null;
  initialTema?: number | null;
  temas?: readonly TemaDisponivel[];
};

export function Feed({
  initialItems,
  total,
  initialOrdenacao,
  initialQuery,
  initialTema,
  temas,
}: FeedProps) {
  return (
    <section>
      <header className="mb-10 grid max-w-[68ch] gap-4">
        <p className="text-sm font-[650] text-primary">Câmara dos Deputados</p>
        <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
          Proposições
        </h1>
      </header>

      <FeedView
        initialItems={initialItems}
        initialTotal={total}
        initialOrdenacao={initialOrdenacao}
        initialQuery={initialQuery}
        initialTema={initialTema}
        temas={temas}
      />
    </section>
  );
}
