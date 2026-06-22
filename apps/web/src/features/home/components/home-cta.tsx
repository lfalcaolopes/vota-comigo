import { ButtonLink } from "@/shared/ui";

export function HomeCta() {
  return (
    <section aria-labelledby="home-cta">
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-6 px-4 py-14 md:py-20">
        <div className="grid max-w-[44ch] gap-3">
          <h2
            className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink md:text-3xl"
            id="home-cta"
          >
            Pronto para comparar?
          </h2>
          <p className="text-base leading-normal text-muted">
            Leva poucos minutos e não exige cadastro. As respostas ficam no seu
            navegador.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink className="sm:w-auto" href="/matcher" variant="primary">
            Fazer comparação
          </ButtonLink>
          <ButtonLink className="sm:w-auto" href="/metodologia" variant="ghost">
            Entenda o método
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
