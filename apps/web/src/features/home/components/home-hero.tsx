import Link from "next/link";

import { ButtonLink } from "@/shared/ui";

import { HomeResultadoSample } from "./home-resultado-sample";

export function HomeHero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-8 px-4 pt-12 pb-12 md:pt-20 md:pb-16 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-12">
        <div className="grid min-w-0 gap-8">
          <div className="grid gap-5">
            <h1 className="text-[2rem] leading-[1.08] font-[730] tracking-[-0.025em] text-balance text-ink md:text-[2.75rem]">
              Veja quais deputados votam como você.
            </h1>
            <p className="max-w-[54ch] text-lg leading-normal text-pretty text-muted">
              O Quem Vota Comigo compara suas posições com os votos que os
              deputados federais registraram nas votações da Câmara. A mesma
              fonte mostra o que cada mandato gastou.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink className="sm:w-auto" href="/matcher" variant="primary">
              Fazer comparação
            </ButtonLink>
            <ButtonLink
              className="sm:w-auto"
              href="/deputados"
              variant="secondary"
            >
              Ver deputados
            </ButtonLink>
          </div>

          <p className="text-sm leading-normal text-subtle">
            Tudo vem dos dados abertos da Câmara dos Deputados.{" "}
            <Link
              className="font-[650] text-muted underline-offset-2 hover:text-ink hover:underline"
              href="/metodologia"
            >
              Como a conta é feita
            </Link>
            .
          </p>
        </div>

        <HomeResultadoSample />
      </div>
    </section>
  );
}
