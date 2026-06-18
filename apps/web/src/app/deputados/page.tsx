import type { Metadata } from "next";

import { DeputadosFeed } from "@/features/deputados";
import {
  feed,
  parseDeputadosFeedUrlState,
  type DeputadosFeedSearchParams,
  ufsDisponiveis,
} from "@/shared/deputado";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deputados | Quem Vota Comigo",
  description:
    "Diretório de deputados federais no Quem Vota Comigo, com busca por nome e filtros por atividade e UF.",
};

export default async function DeputadosPage({
  searchParams,
}: {
  searchParams: Promise<DeputadosFeedSearchParams>;
}) {
  const { query, emAtividade, uf } = parseDeputadosFeedUrlState(
    await searchParams,
  );

  const [{ items, total }, { items: ufs }] = await Promise.all([
    feed(
      20,
      0,
      query ?? undefined,
      emAtividade || undefined,
      uf ?? undefined,
    ),
    ufsDisponiveis(),
  ]);

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto box-border w-full min-w-0 max-w-5xl px-4 pt-8 pb-16 md:pt-12">
        <DeputadosFeed
          initialEmAtividade={emAtividade}
          initialItems={items}
          initialQuery={query}
          initialUf={uf}
          total={total}
          ufs={ufs}
        />
      </div>
    </main>
  );
}
