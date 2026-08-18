import { Disclosure } from "@/shared/ui";

export function OrdenacaoDisclosure() {
  return (
    <Disclosure summary="Como ordenamos os resultados">
      <p>
        A lista dá preferência a deputados com percentual alto apoiado em mais
        votações. Um percentual alto baseado em poucos votos pode aparecer
        abaixo de outro apoiado em mais votos.
      </p>
      <p>
        Tecnicamente, usamos o limite inferior do intervalo de Wilson para
        ordenar os resultados. O número exibido continua sendo a concordância
        bruta.
      </p>
    </Disclosure>
  );
}
