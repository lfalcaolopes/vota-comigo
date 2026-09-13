import { ButtonLink } from "@/shared/ui";

export function HomeComparar() {
  return (
    <section aria-labelledby="home-comparar">
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-10 px-4 py-14 md:py-20">
        <div className="grid max-w-[60ch] gap-4">
          <h2
            className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink md:text-3xl"
            id="home-comparar"
          >
            Compare antes de escolher
          </h2>
          <p className="text-lg leading-normal text-pretty text-muted">
            No fim, cada deputado aparece com um percentual e as votações que
            entraram na conta.
          </p>
          <p className="text-sm leading-normal text-muted">
            Leva poucos minutos, não exige cadastro e as respostas ficam no seu
            navegador.
          </p>
          <div className="mt-2 flex flex-col sm:flex-row">
            <ButtonLink className="sm:w-auto" href="/matcher" variant="primary">
              Fazer comparação
            </ButtonLink>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[52ch] text-base leading-normal text-muted">
            Quer saber mais sobre alguém? Cada deputado tem um perfil com os
            números do mandato.
          </p>
          <ButtonLink
            className="shrink-0 sm:w-auto"
            href="/deputados"
            variant="secondary"
          >
            Ver perfis dos deputados
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
