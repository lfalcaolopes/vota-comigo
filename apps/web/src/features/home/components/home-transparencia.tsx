import Link from "next/link";

import { SourceLink } from "@/shared/ui";

export function HomeTransparencia() {
  return (
    <section
      aria-labelledby="home-transparencia"
      className="border-b border-border bg-surface-muted"
    >
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-8 px-4 py-12 md:py-16">
        <div className="grid max-w-[60ch] gap-3">
          <h2
            className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink"
            id="home-transparencia"
          >
            Método e limites, à vista
          </h2>
          <p className="text-base leading-normal text-muted">
            Antes de qualquer percentual, mostramos de onde vêm os dados, por
            que o método é neutro e o que fica de fora da conta.
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-8 md:grid-cols-3">
          <div className="grid content-start gap-2 border-t border-border-strong pt-4">
            <h3 className="text-lg leading-snug font-[680] text-ink">
              Fonte oficial
            </h3>
            <p className="text-base leading-normal text-pretty text-muted">
              Os dados vêm dos Dados Abertos da Câmara dos Deputados e cobrem as
              votações de 2015 até junho de 2026.
            </p>
            <SourceLink
              href="https://dadosabertos.camara.leg.br/"
              rel="noreferrer"
              target="_blank"
            >
              Dados Abertos da Câmara
            </SourceLink>
          </div>

          <div className="grid content-start gap-2 border-t border-border-strong pt-4">
            <h3 className="text-lg leading-snug font-[680] text-ink">
              Neutralidade
            </h3>
            <p className="text-base leading-normal text-pretty text-muted">
              O produto não recomenda voto nem julga por partido. Ele compara
              votos reais e organiza as evidências para você decidir.
            </p>
            <Link
              className="text-sm font-[650] text-primary underline-offset-2 hover:underline"
              href="/metodologia"
            >
              Ver a metodologia
            </Link>
          </div>

          <div className="grid content-start gap-2 border-t border-border-strong pt-4">
            <h3 className="text-lg leading-snug font-[680] text-ink">
              Limites
            </h3>
            <p className="text-base leading-normal text-pretty text-muted">
              O resultado mostra o voto registrado, não tudo sobre um deputado.
              Leia como começo, não como conclusão.
            </p>
            <Link
              className="text-sm font-[650] text-primary underline-offset-2 hover:underline"
              href="/metodologia"
            >
              Entender os limites
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
