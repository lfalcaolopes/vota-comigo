import Link from "next/link";

import { ButtonLink } from "@/shared/ui";

import { HomeHeroSample } from "./home-hero-sample";

export function HomeHero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid w-full min-w-0 max-w-5xl items-center gap-10 px-4 pt-12 pb-12 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12 md:pt-20 md:pb-16">
        <div className="grid gap-8">
          <div className="grid max-w-[36ch] gap-5">
            <h1 className="text-[2rem] leading-[1.08] font-[730] tracking-[-0.025em] text-balance text-ink md:text-[2.75rem]">
              Veja quais deputados votam como você.
            </h1>
            <p className="max-w-[58ch] text-lg leading-normal text-pretty text-muted">
              O Quem Vota Comigo compara as suas posições com os votos reais de
              deputados federais nas votações da Câmara. Sem recomendação de
              voto e com método aberto.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink className="sm:w-auto" href="/matcher" variant="primary">
              Fazer comparação
            </ButtonLink>
            <ButtonLink
              className="sm:w-auto"
              href="/proposicoes"
              variant="secondary"
            >
              Ver proposições
            </ButtonLink>
          </div>

          <p className="text-sm leading-normal text-subtle">
            Baseado nos dados abertos da Câmara dos Deputados.{" "}
            <Link
              className="font-[650] text-muted underline-offset-2 hover:text-ink hover:underline"
              href="/metodologia"
            >
              Como o cálculo funciona
            </Link>
            .
          </p>
        </div>

        <div className="hidden lg:block">
          <HomeHeroSample />
        </div>
      </div>
    </section>
  );
}
