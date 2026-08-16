import type { Metadata } from "next";

import { DeputadosFeed } from "@/features/deputados";
import {
  feed,
  partidosDisponiveis,
  parseDeputadosFeedUrlState,
  type DeputadosFeedSearchParams,
  ufsDisponiveis,
} from "@/shared/deputado";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deputados",
  description:
    "Diretório de deputados federais no Quem Vota Comigo, com busca por nome e filtros por atividade, UF e partido.",
};

export default async function DeputadosPage({
  searchParams,
}: {
  searchParams: Promise<DeputadosFeedSearchParams>;
}) {
  const { query, ...filtros } = parseDeputadosFeedUrlState(await searchParams);

  const [{ items, total }, { items: ufs }, { items: partidos }] =
    await Promise.all([
      feed(20, 0, query, filtros),
      ufsDisponiveis(),
      partidosDisponiveis(),
    ]);

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto box-border w-full min-w-0 max-w-5xl px-4 pt-8 pb-16 md:pt-12">
        <DeputadosFeed
          initialFiltros={filtros}
          initialItems={items}
          initialQuery={query}
          partidos={partidos}
          total={total}
          ufs={ufs}
        />
      </div>
    </main>
  );
}
