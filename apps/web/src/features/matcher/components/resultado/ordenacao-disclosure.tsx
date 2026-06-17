import { Disclosure } from "@/shared/ui";

export function OrdenacaoDisclosure() {
  return (
    <Disclosure summary="Como ordenamos os resultados">
      <p>
        A ordem segue a confiabilidade estatística da compatibilidade: usamos o
        limite inferior do intervalo de Wilson, que penaliza deputados com
        poucas votações comparáveis, mesmo quando o percentual é alto.
      </p>
      <p>
        Por isso, um percentual alto baseado em poucas votações comparáveis nem
        sempre fica no topo. O número que você vê é a compatibilidade bruta; a
        posição na lista também leva em conta quantas votações sustentam esse
        percentual.
      </p>
    </Disclosure>
  );
}
