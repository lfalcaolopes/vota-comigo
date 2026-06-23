import type { Metadata } from "next";

import { Panel, SourceLink } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Metodologia | Quem Vota Comigo",
  description:
    "Como o Quem Vota Comigo calcula compatibilidade a partir de votações nominais e dados abertos oficiais.",
};

export default function MetodologiaPage() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-200 gap-8 px-4 pt-8 pb-16 md:pt-12">
        <header className="grid max-w-[68ch] gap-4">
          <p className="text-sm font-[650] text-primary">Metodologia</p>
          <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
            A compatibilidade vem do voto real do deputado.
          </h1>
          <p className="text-base leading-normal text-muted">
            O matcher compara a sua opinião sobre cada proposição com o voto que
            o deputado registrou no plenário. Ler bem o resultado depende de
            saber o que entra na conta e o que fica de fora.
          </p>
        </header>

        <div className="grid gap-4">
          <Panel title="De onde vêm os dados">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Tudo vem dos Dados Abertos da Câmara dos Deputados. Cada
                proposição e cada votação mantém o número oficial da Câmara,
                então você pode conferir qualquer item na fonte, com link para a
                consulta pública sempre que ela tem o detalhe disponível.
              </p>
              <SourceLink
                href="https://dadosabertos.camara.leg.br/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Dados Abertos da Câmara dos Deputados
              </SourceLink>
            </div>
          </Panel>

          <Panel title="O que entra na base">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Consideramos apenas a Câmara dos Deputados e apenas votações
                nominais de plenário, aquelas em que o voto de cada deputado
                fica registrado. Votações de comissão ficam de fora, porque lá
                só os membros votam e a comparação ficaria distorcida; votações
                por aclamação também, porque não registram voto individual.
              </p>
              <p>
                O voto individual dos deputados está disponível a partir de
                2001, início da legislatura 51. Quem não tem comportamento de
                voto documentado nesse período não entra na base.
              </p>
            </div>
          </Panel>

          <Panel title="Como a compatibilidade é calculada">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Para cada proposição, você responde se ela deveria ser aprovada:
                Sim, Não ou Não sei. A resposta Sim concorda com o voto sim do
                deputado, e a resposta Não concorda com o voto não, não importa
                se a proposição foi aprovada ou rejeitada no fim. Não sei é
                desconsiderado. Uma comparação usa de 3 a 30 proposições, com
                pelo menos 3 respostas válidas.
              </p>
              <p>
                Abstenção e obstrução (quando o deputado participa da votação,
                mas não vota sim nem não) contam como discordância, e o voto
                real continua aparecendo na tela. A ausência de quem estava em
                exercício também conta como discordância: a fonte não distingue
                falta justificada de injustificada, e premiar a ausência
                contradiz a ideia de cobrar o comportamento real. Também ficam
                de fora da conta as votações de quem não estava em exercício na
                data, por licença, suplência inativa ou fim de mandato, e os
                registros de impedimento regimental que a Câmara marca como
                Artigo 17.
              </p>
            </div>
          </Panel>

          <Panel title="Qual votação representa cada proposição">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Uma proposição costuma passar por várias votações. O matcher
                escolhe a que decide o mérito (o texto-base, o substitutivo ou a
                medida provisória) e ignora requerimentos, destaques,
                preliminares e redação final, que não representam sozinhos a
                decisão de fundo.
              </p>
            </div>
          </Panel>

          <Panel title="Como ler o resultado">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                O percentual deve ser lido junto da amostra comparável: quantas
                das suas respostas puderam de fato ser comparadas com aquele
                deputado. Uma compatibilidade alta sobre poucas votações diz
                menos do que uma compatibilidade parecida sobre muitas.
              </p>
              <p>
                Por isso a ordem do ranking não usa só o percentual bruto. Ela
                usa o limite inferior do intervalo de Wilson, que evita que um
                100% obtido em pouquíssimas votações apareça acima de um
                resultado com amostra maior e mais confiável.
              </p>
            </div>
          </Panel>

          <Panel title="Limites da aplicação">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                O resultado ajuda a ler comportamento parlamentar registrado,
                mas não resume tudo sobre um deputado, uma proposição ou uma
                eleição. Use a compatibilidade como ponto de partida para
                avaliar o histórico de voto, não como conclusão automática.
              </p>
              <ul className="grid gap-3 pl-5 [list-style:disc]">
                <li>
                  A compatibilidade não mostra o que o deputado pensa. Ela
                  mostra se o voto registrado na votação usada como referência
                  coincidiu com a sua posição.
                </li>
                <li>
                  A presença exibida no perfil não é a presença parlamentar
                  geral. Ela considera somente votações nominais de plenário das
                  proposições que entram na base da aplicação.
                </li>
                <li>
                  Uma proposição pode ter várias votações. A aplicação escolhe
                  uma votação para representá-la, priorizando decisões sobre o
                  mérito da proposta. Essa escolha segue uma regra pública, mas
                  pode não capturar todas as nuances do processo legislativo.
                </li>
                <li>
                  Nem toda proposição da Câmara aparece na aplicação. Entram
                  apenas proposições com votação nominal em plenário e uma
                  votação que possa representar a decisão principal sobre a
                  proposta.
                </li>
                <li>
                  O cálculo olha a votação de referência, não todas as votações
                  ligadas à proposição. Quando um deputado fica fora do ranking,
                  isso não prova que ele faltou a todas as votações das
                  proposições selecionadas; significa que não houve votos
                  comparáveis suficientes nas votações usadas pela aplicação.
                </li>
                <li>
                  Quando não há voto registrado para um deputado que estava em
                  exercício, a aplicação trata como ausência sem motivo
                  conhecido. Os Dados Abertos da Câmara usados pela aplicação
                  não permitem separar uma ausência comum de uma ausência
                  justificada.
                </li>
                <li>
                  Quando o histórico oficial indica que o deputado estava fora
                  de exercício, por exemplo por licença, suplência inativa ou
                  fim de mandato, essa votação fica fora do cálculo daquele
                  deputado.
                </li>
              </ul>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
