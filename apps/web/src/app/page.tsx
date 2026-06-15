import type { Metadata } from "next";

import { feedOrdenacao } from "@vota-comigo/shared-types";

import { Feed } from "@/features/feed";
import { feed } from "@/shared/proposicao";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposições | Quem Vota Comigo",
  description:
    "Proposições computáveis pelo matcher na Câmara dos Deputados, a partir dos dados abertos oficiais.",
};

type HomeSearchParams = {
  ordenacao?: string;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const ordenacao = feedOrdenacao
    .catch(() => 'mais-votadas' as const)
    .parse(params.ordenacao);

  const { items, total } = await feed(20, 0, ordenacao);

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto w-full min-w-0 max-w-295 px-4 pt-8 pb-16 md:pt-12">
        <Feed initialItems={items} total={total} initialOrdenacao={ordenacao} />
      </div>
    </main>
  );
}
