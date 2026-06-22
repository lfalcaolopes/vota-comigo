import type { Metadata } from "next";

import {
  HomeComoFunciona,
  HomeCta,
  HomeEmVotacao,
  HomeHero,
  HomeTransparencia,
} from "@/features/home";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quem Vota Comigo | Veja quais deputados votam como você",
  description:
    "Compare suas posições com os votos reais de deputados federais na Câmara dos Deputados, com fonte oficial e método aberto.",
};

export default function Home() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <HomeHero />
      <HomeComoFunciona />
      <HomeEmVotacao />
      <HomeTransparencia />
      <HomeCta />
    </main>
  );
}
