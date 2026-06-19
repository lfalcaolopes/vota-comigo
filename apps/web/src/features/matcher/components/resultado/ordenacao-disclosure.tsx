import { Disclosure } from "@/shared/ui";

export function OrdenacaoDisclosure() {
  return (
    <Disclosure summary="Como ordenamos os resultados">
      <p>
        A lista dá preferência a deputados com compatibilidade alta sustentada
        por mais votações comparáveis. Um percentual alto baseado em poucos
        votos pode aparecer abaixo de outro resultado com amostra maior.
      </p>
      <p>
        Tecnicamente, usamos o limite inferior do intervalo de Wilson para
        ordenar os resultados. O número exibido continua sendo a compatibilidade
        bruta.
      </p>
    </Disclosure>
  );
}
