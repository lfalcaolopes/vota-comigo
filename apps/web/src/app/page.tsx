import type { Metadata } from "next";

import { Feed } from "@/features/feed";
import { maisVotadas } from "@/shared/proposicao";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposições mais votadas | Quem Vota Comigo",
  description:
    "As proposições mais votadas em plenário na Câmara dos Deputados, a partir dos dados abertos oficiais.",
};

export default async function Home() {
  const { items, total } = await maisVotadas(20, 0);

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto w-full min-w-0 max-w-295 px-4 pt-8 pb-16 md:pt-12">
        <Feed initialItems={items} total={total} />
      </div>
    </main>
  );
}
