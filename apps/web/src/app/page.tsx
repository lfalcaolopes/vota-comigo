import type { Metadata } from "next";

import { SITE_DESCRIPTION } from "@/shared/lib/site";
import {
  HomeComparar,
  HomeCotaLegislatura,
  HomeHero,
  HomeProposicoes,
} from "@/features/home";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Quem Vota Comigo | Veja quais deputados votam como você",
  },
  description: SITE_DESCRIPTION,
};

export default function Home() {
  return (
    <main className="vc-bands min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <HomeHero />
      <HomeCotaLegislatura />
      <HomeProposicoes />
      <HomeComparar />
    </main>
  );
}
