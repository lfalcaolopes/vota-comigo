import type { Metadata } from "next";

import { Matcher } from "@/features/matcher";
import { feed, temasDisponiveis } from "@/shared/proposicao";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quem vota comigo | Quem Vota Comigo",
  description:
    "Declare sua posição sobre as proposições mais votadas e descubra quais deputados federais votaram de forma compatível com você.",
};

export default async function MatcherPage() {
  const [{ items, total }, { items: temas }] = await Promise.all([
    feed(20, 0),
    temasDisponiveis(),
  ]);

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto w-full min-w-0 max-w-2xl px-4 pt-8 pb-16 md:pt-12">
        <Matcher initialProposicoes={items} initialTotal={total} temas={temas} />
      </div>
    </main>
  );
}
