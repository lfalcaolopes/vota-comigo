import type { Metadata } from "next";

import { Panel, SourceLink } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Metodologia",
  description:
    "Como o Quem Vota Comigo calcula a concordância, monta o perfil do deputado e trata os dados abertos oficiais.",
};

export default function MetodologiaPage() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-200 gap-12 px-4 pt-8 pb-16 md:pt-12">
        <header className="grid max-w-[68ch] gap-4">
          <p className="text-sm font-[650] text-primary">Metodologia</p>
          <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
            Tudo aqui vem do registro oficial do mandato.
          </h1>
          <p className="text-base leading-normal text-muted">
            Comparamos a sua opinião sobre cada proposição com o voto que o
            deputado registrou no plenário, e reunimos no perfil de cada um o
            que a Câmara publica sobre a atuação do mandato. Ler bem esses
            números depende de saber o que entra na conta e o que fica de fora.
          </p>
          <p className="text-base leading-normal text-muted">
            Proposição é o nome oficial do que o resto do site chama de
            proposta: projeto de lei (PL), proposta de emenda à Constituição
            (PEC), medida provisória (MPV) e os demais tipos que a Câmara vota.
            Esta página usa o termo oficial porque é ele que você vai encontrar
            no portal da Câmara.
          </p>
        </header>

        <section aria-labelledby="grupo-concordancia" className="grid gap-4">
          <h2
            className="text-sm font-[650] tracking-wide text-subtle uppercase"
            id="grupo-concordancia"
          >
            A comparação de votos
          </h2>

          <Panel title="De onde vêm os dados" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Tudo vem dos Dados Abertos da Câmara dos Deputados: as votações
                nominais, o histórico de exercício de cada deputado, a cota
                parlamentar, os discursos, os vínculos com comissões e as
                proposições assinadas. Cada proposição e cada votação mantém o
                número oficial da Câmara, então você pode conferir qualquer item
                na fonte, com link para a consulta pública sempre que ela tem o
                detalhe disponível.
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

          <Panel title="O que entra na base" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Consideramos apenas a Câmara dos Deputados e apenas votações
                nominais de plenário, aquelas em que o voto de cada deputado
                fica registrado. Votações de comissão ficam de fora, porque lá
                só os membros votam e a comparação ficaria distorcida; votações
                por aclamação também, porque não registram voto individual.
              </p>
              <p>
                A base cobre as votações nominais realizadas de 2015 até agosto
                de 2026. O recorte é pela data da votação, não pela idade da
                proposição: uma proposição mais antiga aparece se foi votada
                nesse período.
              </p>
            </div>
          </Panel>

          <Panel title="Como a concordância é calculada" titleAs="h3">
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

          <Panel title="Quem entra na comparação" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Por padrão, o resultado mostra os deputados do estado que você
                informou. Você pode trocar o alcance para o Brasil inteiro a
                qualquer momento, sem refazer as respostas.
              </p>
              <p>
                Também por padrão, entram tanto quem está em exercício hoje
                quanto quem votou no período mas já deixou o mandato, porque o
                histórico de voto de ambos é igualmente real. O filtro de apenas
                em atividade restringe a lista a quem está em exercício, e é a
                escolha certa quando você quer usar o resultado para decidir um
                voto.
              </p>
              <p>
                Deputados cuja última legislatura é anterior à 51ª, iniciada em
                1999, não existem no Quem Vota Comigo: a Câmara só publica
                arquivos de votos a partir de 2001, e um perfil sem nenhum voto
                registrado não teria o que comparar.
              </p>
            </div>
          </Panel>

          <Panel title="Qual votação representa cada proposição" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Uma proposição costuma passar por várias votações. Escolhemos a
                que decide o mérito (o texto-base, o substitutivo ou a medida
                provisória) e ignoramos requerimentos, destaques, preliminares e
                redação final, que não representam sozinhos a decisão de fundo.
              </p>
            </div>
          </Panel>

          <Panel title="Como ler o resultado" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                O percentual deve ser lido junto da amostra comparável: quantas
                das suas respostas puderam de fato ser comparadas com aquele
                deputado. Uma concordância alta sobre poucas votações diz menos
                do que uma concordância parecida sobre muitas.
              </p>
              <p>
                Por isso a ordem do ranking não usa só o percentual bruto. Ela
                usa o limite inferior do intervalo de Wilson, que evita que um
                100% obtido em pouquíssimas votações apareça acima de um
                resultado com amostra maior e mais confiável.
              </p>
              <p>
                Se alguma proposição pesa mais para você do que as outras, o
                filtro de concordância deixa marcar essas proposições e reduzir
                a lista a quem concordou com você em todas elas. Ele muda quem
                aparece, não o percentual de cada um. Uma lista vazia com o
                filtro ligado é uma resposta legítima: significa que nenhum
                deputado daquele alcance votou como você naquilo. Esse filtro
                não vai para o endereço da página, de propósito, para que o link
                ou uma captura de tela não revelem a sua posição sobre uma
                proposição específica.
              </p>
            </div>
          </Panel>
        </section>

        <section aria-labelledby="grupo-perfil" className="grid gap-4">
          <h2
            className="text-sm font-[650] tracking-wide text-subtle uppercase"
            id="grupo-perfil"
          >
            O perfil e o comparativo
          </h2>

          <Panel title="Resumos por IA das proposições" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                O texto legislativo é difícil de ler, então algumas proposições
                trazem um resumo gerado por inteligência artificial, sempre
                identificado como tal. Quando a proposição tem inteiro teor
                publicado, o modelo lê o PDF oficial completo; quando não tem, o
                resumo se apoia na ementa, na ementa detalhada e nas
                palavras-chave da própria Câmara.
              </p>
              <p>
                Nenhum resumo aparece automaticamente: cada um passa por revisão
                humana antes de ser publicado, e volta para revisão quando o
                texto oficial que o originou muda. O resumo é um apoio de
                leitura e pode conter imprecisões; a ementa oficial e o inteiro
                teor continuam ao lado dele, e são eles que valem.
              </p>
            </div>
          </Panel>

          <Panel title="Presença registrada" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                A presença mostrada no perfil e no comparativo não é a presença
                parlamentar oficial. Ela conta apenas as votações nominais de
                plenário que entram na nossa base, dentro da legislatura
                indicada na tela.
              </p>
              <p>
                Cada votação daquele recorte cai em um de quatro casos: o
                deputado votou, faltou sem motivo conhecido, estava fora de
                exercício (licença, suplência inativa ou fim de mandato) ou o
                dado não existe na fonte. O percentual divide as presenças pelas
                votações em que ele estava em exercício, então quem assumiu no
                meio da legislatura não é penalizado pelo período em que não era
                deputado.
              </p>
            </div>
          </Panel>

          <Panel title="Proposições assinadas e comissões" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Proposições assinadas conta as proposições apresentadas no ano
                em que o deputado aparece entre os autores, seguindo o mesmo
                critério do portal da Câmara: vale qualquer assinatura, e o
                recorte é a data de apresentação da proposição. Documentos e
                ofícios ficam de fora por não serem proposições legislativas.
                Autor principal é o subconjunto em que ele assina em primeiro
                lugar.
              </p>
              <p>
                O número não mede qualidade nem resultado: uma proposição
                assinada pode nunca ter sido votada. Relatorias não entram, por
                não estarem disponíveis nos dados abertos que usamos.
              </p>
              <p>
                Comissões e outros órgãos listam os vínculos registrados no ano
                selecionado, com o cargo exercido em cada um.
              </p>
            </div>
          </Panel>

          <div id="gastos-cota" className="scroll-mt-24">
            <Panel title="Gastos da cota parlamentar" titleAs="h3">
              <div className="grid gap-3 leading-normal text-muted">
                <p>
                  Os gastos vêm do arquivo de despesas da cota publicado pela
                  Câmara, por deputado e por ano. O que a cota é, como funciona
                  o teto por estado e por que o gasto de um mês pode passar do
                  limite mensal está explicado ao lado dos próprios números, no
                  perfil e no comparativo.
                </p>
                <p>
                  O que importa saber antes de comparar valores é o alcance dos
                  dados. A base cobre 2015 em diante, e o ano corrente aparece
                  sempre parcial, até o mês publicado pela Câmara. Passagens
                  aéreas emitidas pelo SIGEPA deixaram de constar nessa fonte a
                  partir de agosto de 2025, então o total exibido pode ficar
                  abaixo do informado pela Câmara; quando isso afeta o ano na
                  tela, o aviso aparece junto do valor.
                </p>
                <p>
                  Quem não exerceu o mandato durante o ano inteiro fica sem
                  comparação com a mediana do estado, porque um mandato de
                  poucos meses gasta menos por construção e a comparação diria
                  mais sobre o calendário do que sobre o gasto.
                </p>
              </div>
            </Panel>
          </div>

          <div id="ordenacao-uso-cota" className="scroll-mt-24">
            <Panel title="Ordenação por menor uso da cota" titleAs="h3">
              <div className="grid gap-3 leading-normal text-muted">
                <p>
                  Essa ordenação usa o percentual da cota consumido no último
                  período de mandato analisado: 100 × gasto do período ÷ limite
                  mensal de referência acumulado. Somamos gastos e limites antes
                  da divisão, sem fazer média de percentuais anuais. Cada
                  resultado informa as datas do período e quantos dias o
                  deputado esteve efetivamente em exercício.
                </p>
                <p>
                  O gasto segue a competência financeira informada pela Câmara
                  em <code>numAno</code> e <code>numMes</code>, não a emissão do
                  comprovante nem o pagamento da restituição. Débitos,
                  cancelamentos e restituições de toda a legislatura entram até
                  o último mês coberto, inclusive ajustes lançados em meses sem
                  exercício.
                </p>
                <p>
                  O limite mensal de referência soma uma vez cada mês tocado por
                  um intervalo de exercício, usando a UF histórica daquele
                  período e o limite vigente no primeiro dia do mês. Não há
                  proporção por dia: a quantidade de dias aparece como contexto,
                  mas não altera o limite do mês. O ano corrente termina no
                  mesmo último mês coberto usado para o gasto; ausência de gasto
                  só vale como zero quando a cobertura comprova que o período
                  foi carregado.
                </p>
                <p>
                  Passagens aéreas SIGEPA só entram quando a reposição do ano
                  está completa. Se faltarem cobertura, intervalo confiável, UF,
                  limite ou reposição, o uso fica indisponível e o deputado
                  continua na lista depois dos resultados calculáveis.
                </p>
                <p>
                  O limite mensal de referência é o valor regular definido para
                  a UF e não contém adicionais ligados a alguns cargos e
                  funções. Por isso um percentual acima de 100% não indica, por
                  si só, irregularidade. Valores negativos também são
                  preservados, pois restituições e cancelamentos podem superar
                  os débitos do período. A métrica descreve uso da cota, não
                  qualidade, produtividade ou desempenho parlamentar.
                </p>
              </div>
            </Panel>
          </div>

          <Panel title="Comparativo entre deputados" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                O comparativo põe lado a lado até quatro deputados. Cada coluna
                usa como janela a legislatura em que aquele deputado esteve em
                exercício pela última vez, e não um período fixo igual para
                todos. Comparar o mandato atual de um com o mandato encerrado de
                outro continua possível, mas a tela avisa quando as janelas são
                diferentes, porque números de períodos distintos não se somam.
              </p>
              <p>
                As médias por ano dividem pelo tempo efetivamente coberto pelos
                dados, não pelo número de anos do calendário. Um ano corrente
                que só tem dados até agosto conta como fração, para não rebaixar
                artificialmente a média de quem está no meio do mandato.
              </p>
              <p>
                Deputados cuja última legislatura é anterior à 55ª, iniciada em
                2015, ficam fora do comparativo: a cobertura de votações, cota e
                medianas começa ali, e não haveria o que colocar nas linhas.
              </p>
            </div>
          </Panel>
        </section>

        <section aria-labelledby="grupo-transparencia" className="grid gap-4">
          <h2
            className="text-sm font-[650] tracking-wide text-subtle uppercase"
            id="grupo-transparencia"
          >
            Transparência
          </h2>

          <Panel title="O que acontece com as suas respostas" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                As suas posições não são guardadas. Elas ficam no seu navegador
                enquanto a aba estiver aberta, para que você possa voltar um
                passo ou recarregar a página sem perder o progresso, e são
                enviadas ao servidor apenas no momento de calcular o resultado,
                sem ficarem registradas lá.
              </p>
              <p>
                Do uso da comparação, guardamos apenas duas contagens sem dono:
                quantas proposições foram selecionadas e quantas foram
                respondidas, com a data. Nenhuma posição declarada, nenhum
                estado informado, nenhum endereço de IP e nenhum identificador
                que permita reconhecer você depois. Também usamos medição de
                audiência agregada para saber quais páginas são acessadas, sem
                perfil individual.
              </p>
            </div>
          </Panel>

          <Panel title="Limites" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                O resultado ajuda a ler comportamento parlamentar registrado,
                mas não resume tudo sobre um deputado ou uma proposição. Use a
                concordância como ponto de partida para avaliar o histórico de
                voto, não como conclusão automática.
              </p>
              <ul className="grid gap-3 pl-5 [list-style:disc]">
                <li>
                  A concordância não mostra o que o deputado pensa. Ela mostra
                  se o voto registrado na votação usada como referência
                  coincidiu com a sua posição.
                </li>
                <li>
                  A presença exibida no perfil não é a presença parlamentar
                  geral. Ela considera somente votações nominais de plenário das
                  proposições que entram na nossa base.
                </li>
                <li>
                  Uma proposição pode ter várias votações. Escolhemos uma
                  votação para representá-la, priorizando decisões sobre o
                  mérito da proposição. Essa escolha segue uma regra pública,
                  mas pode não capturar todas as nuances do processo
                  legislativo.
                </li>
                <li>
                  Nem toda proposição da Câmara aparece no site. Entram apenas
                  proposições com votação nominal em plenário e uma votação que
                  possa representar a decisão principal sobre ela.
                </li>
                <li>
                  O cálculo olha a votação de referência, não todas as votações
                  ligadas à proposição. Quando um deputado fica fora do ranking,
                  isso não prova que ele faltou a todas as votações das
                  proposições selecionadas; significa que não houve votos
                  comparáveis suficientes nas votações que usamos.
                </li>
                <li>
                  Quando não há voto registrado para um deputado que estava em
                  exercício, tratamos como ausência sem motivo conhecido. Os
                  Dados Abertos da Câmara que usamos não permitem separar uma
                  ausência comum de uma ausência justificada.
                </li>
                <li>
                  Quando o histórico oficial indica que o deputado estava fora
                  de exercício, por exemplo por licença, suplência inativa ou
                  fim de mandato, essa votação fica fora do cálculo daquele
                  deputado.
                </li>
                <li>
                  Contagens de atuação, como proposições assinadas e discursos,
                  medem atividade registrada, não relevância nem resultado. Um
                  número alto não significa melhor desempenho.
                </li>
                <li>
                  Gasto de cota dentro do teto não atesta regularidade, e passar
                  do teto exibido não indica irregularidade: a comparação usa a
                  tabela por estado, sem os adicionais mensais previstos para
                  alguns cargos.
                </li>
                <li>
                  Os resumos por IA são apoio de leitura revisado por pessoas,
                  não texto oficial. Em caso de divergência, vale o inteiro teor
                  publicado pela Câmara.
                </li>
              </ul>
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}
