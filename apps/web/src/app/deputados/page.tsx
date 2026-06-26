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
  const { query, emAtividade, uf, partido } = parseDeputadosFeedUrlState(
    await searchParams,
  );

  const [{ items, total }, { items: ufs }, { items: partidos }] =
    await Promise.all([
      feed(
        20,
        0,
        query ?? undefined,
        emAtividade || undefined,
        uf ?? undefined,
        partido ?? undefined,
      ),
      ufsDisponiveis(),
      partidosDisponiveis(),
    ]);

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto box-border w-full min-w-0 max-w-5xl px-4 pt-8 pb-16 md:pt-12">
        <DeputadosFeed
          initialEmAtividade={emAtividade}
          initialItems={items}
          initialPartido={partido}
          initialQuery={query}
          initialUf={uf}
          partidos={partidos}
          total={total}
          ufs={ufs}
        />
      </div>
    </main>
  );
}
