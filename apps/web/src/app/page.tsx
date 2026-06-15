import type { Metadata } from "next";

import { Feed } from "@/features/feed";
import { feed } from "@/shared/proposicao";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposições | Quem Vota Comigo",
  description:
    "Proposições computáveis pelo matcher na Câmara dos Deputados, a partir dos dados abertos oficiais.",
};

export default async function Home() {
  const { items, total } = await feed(20, 0);

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto w-full min-w-0 max-w-295 px-4 pt-8 pb-16 md:pt-12">
        <Feed initialItems={items} total={total} />
      </div>
    </main>
  );
}
