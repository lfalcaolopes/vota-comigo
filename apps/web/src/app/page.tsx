import type { Metadata } from "next";

import { feedOrdenacao } from "@vota-comigo/shared-types";

import { Feed } from "@/features/feed";
import { feed, temasDisponiveis } from "@/shared/proposicao";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposições | Quem Vota Comigo",
  description:
    "Proposições computáveis pelo matcher na Câmara dos Deputados, a partir dos dados abertos oficiais.",
};

type HomeSearchParams = {
  ordenacao?: string;
  tema?: string;
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

  const temaParam = parseTemaParam(params.tema);

  const [{ items, total }, { items: temas }] = await Promise.all([
    feed(20, 0, ordenacao, temaParam ?? undefined),
    temasDisponiveis(),
  ]);

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto w-full min-w-0 max-w-295 px-4 pt-8 pb-16 md:pt-12">
        <Feed
          initialItems={items}
          total={total}
          initialOrdenacao={ordenacao}
          initialTema={temaParam}
          temas={temas}
        />
      </div>
    </main>
  );
}

function parseTemaParam(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
