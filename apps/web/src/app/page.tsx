import type { Metadata } from "next";

import { Feed } from "@/features/feed";
import {
  feed,
  parseFeedUrlState,
  temasDisponiveis,
  type FeedSearchParams,
} from "@/shared/proposicao";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposições | Quem Vota Comigo",
  description:
    "Proposições computáveis pelo matcher na Câmara dos Deputados, a partir dos dados abertos oficiais.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}) {
  const { ordenacao, query, tema } = parseFeedUrlState(await searchParams);

  const [{ items, total }, { items: temas }] = await Promise.all([
    feed(20, 0, ordenacao, tema ?? undefined, query ?? undefined),
    temasDisponiveis(),
  ]);

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto box-border w-full min-w-0 max-w-5xl px-4 pt-8 pb-16 md:pt-12">
        <Feed
          initialItems={items}
          total={total}
          initialOrdenacao={ordenacao}
          initialQuery={query}
          initialTema={tema}
          temas={temas}
        />
      </div>
    </main>
  );
}
