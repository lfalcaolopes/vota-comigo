import type { ProposicaoCard } from "@vota-comigo/shared-types";
import type { Metadata } from "next";

import {
  HomeComoFunciona,
  HomeCta,
  HomeEmVotacao,
  HomeHero,
  HomeTransparencia,
} from "@/features/home";
import { feed } from "@/shared/proposicao";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quem Vota Comigo | Veja quais deputados votam como você",
  description:
    "Compare suas posições com os votos reais de deputados federais na Câmara dos Deputados, com fonte oficial e método aberto.",
};

async function loadDestaques(): Promise<ProposicaoCard[]> {
  try {
    const { items } = await feed(3, 0);
    return items;
  } catch {
    return [];
  }
}

export default async function Home() {
  const items = await loadDestaques();

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <HomeHero />
      <HomeComoFunciona />
      <HomeEmVotacao proposicoes={items} />
      <HomeTransparencia />
      <HomeCta />
    </main>
  );
}
