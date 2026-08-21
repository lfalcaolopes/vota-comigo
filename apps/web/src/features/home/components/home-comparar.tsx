import { ButtonLink } from "@/shared/ui";

export function HomeComparar() {
  return (
    <section aria-labelledby="home-comparar">
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-8 px-4 py-14 md:py-20">
        <h2
          className="max-w-[60ch] text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink md:text-3xl"
          id="home-comparar"
        >
          Escolha por onde começar
        </h2>

        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          <div className="flex flex-col gap-4">
            <h3 className="text-lg leading-snug font-[680] text-ink">
              Pelas suas posições
            </h3>
            <p className="max-w-[46ch] text-base leading-normal text-muted">
              Leva poucos minutos, não exige cadastro e as respostas ficam no
              seu navegador.
            </p>
            <div className="mt-auto flex flex-col sm:flex-row">
              <ButtonLink
                className="sm:w-auto"
                href="/matcher"
                variant="primary"
              >
                Fazer comparação
              </ButtonLink>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-lg leading-snug font-[680] text-ink">
              Entre deputados
            </h3>
            <p className="max-w-[46ch] text-base leading-normal text-muted">
              Dois ou três deputados lado a lado, com a presença registrada, as
              propostas assinadas, as comissões e o gasto da cota parlamentar de
              cada um.
            </p>
            <div className="mt-auto flex flex-col sm:flex-row">
              <ButtonLink
                className="sm:w-auto"
                href="/deputados"
                variant="secondary"
              >
                Escolher deputados para comparar
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
