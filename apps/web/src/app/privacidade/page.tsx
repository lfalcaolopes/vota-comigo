import type { Metadata } from "next";

import { SourceLink } from "@/shared/ui";

import { BrowserDataControls } from "./browser-data-controls";

export const metadata: Metadata = {
  title: "Privacidade e proteção de dados",
  description:
    "Quais dados o Quem Vota Comigo trata, por que os utiliza e como exercer seus direitos.",
};

const dataGroups = [
  {
    title: "Ao navegar pelo site",
    body: (
      <>
        Podemos receber a página acessada, data e horário, página de origem,
        parâmetros de campanha, localização aproximada, idioma e informações
        sobre navegador, sistema operacional e tipo de dispositivo. Usamos esses
        dados para medir audiência, entender como o projeto é encontrado e
        melhorar o serviço.
      </>
    ),
  },
  {
    title: "Ao fazer uma comparação",
    body: (
      <>
        Processamos o estado informado, as proposições escolhidas, suas posições
        sobre elas e os filtros aplicados. Opiniões políticas podem ser dados
        sensíveis. Por isso, essas respostas são usadas somente para calcular o
        resultado solicitado, não são associadas a uma conta e não são guardadas
        pelo servidor como histórico da pessoa.
      </>
    ),
  },
  {
    title: "Para medir o uso da comparação",
    body: (
      <>
        Registramos quando uma comparação é iniciada ou concluída, quantas
        proposições foram selecionadas e quantas foram respondidas, além da
        origem do primeiro acesso quando ela estiver disponível. Esses registros
        não contêm as proposições escolhidas, as respostas, o estado informado,
        endereço de IP ou um identificador de usuário.
      </>
    ),
  },
  {
    title: "Quando ocorre uma falha",
    body: (
      <>
        Serviços de infraestrutura e monitoramento podem receber a rota
        acessada, horários, dados do dispositivo, detalhes técnicos do erro e
        informações necessárias para entregar e proteger a conexão. O
        monitoramento não grava a tela nem reproduz a sessão do visitante.
      </>
    ),
  },
  {
    title: "Quando você entra em contato",
    body: (
      <>
        Tratamos seu endereço de e-mail, o conteúdo da mensagem e as informações
        que você decidir enviar para responder à solicitação e manter o registro
        necessário do atendimento.
      </>
    ),
  },
  {
    title: "Sobre deputados",
    body: (
      <>
        Organizamos identificação parlamentar, votos, presença, proposições e
        despesas publicados pela Câmara dos Deputados. Usamos esses dados para
        informar o público e facilitar a fiscalização da atuação parlamentar.
        Você pode pedir a correção da apresentação no Quem Vota Comigo. Erros na
        fonte também precisam ser corrigidos pela Câmara. Ver os{" "}
        <SourceLink
          href="https://dadosabertos.camara.leg.br/"
          rel="noopener noreferrer"
          target="_blank"
        >
          Dados Abertos da Câmara
        </SourceLink>
        .
      </>
    ),
  },
] as const;

const providerLinks = [
  {
    name: "Vercel",
    purpose: "hospedagem do site e medição agregada de páginas e eventos",
    href: "https://vercel.com/docs/analytics/privacy-policy",
  },
  {
    name: "Google Cloud",
    purpose: "execução da API e registros técnicos de infraestrutura",
    href: "https://cloud.google.com/terms/cloud-privacy-notice",
  },
  {
    name: "Neon",
    purpose: "hospedagem do banco de dados operacional",
    href: "https://neon.com/privacy-policy",
  },
  {
    name: "Sentry",
    purpose: "diagnóstico de erros e desempenho, sem gravação de sessão",
    href: "https://sentry.io/privacy/",
  },
  {
    name: "Umami Cloud",
    purpose: "medição agregada de audiência sem cookies",
    href: "https://umami.is/privacy",
  },
] as const;

const linkClassName =
  "rounded-sm font-[650] text-info underline decoration-info/35 underline-offset-[0.18em] transition-colors duration-[140ms] ease-standard hover:decoration-info";

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-[48rem] gap-10 px-4 pt-8 pb-16 md:gap-12 md:pt-12 md:pb-20">
        <header className="grid max-w-[70ch] gap-4">
          <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
            Privacidade e proteção de dados
          </h1>
          <p className="text-lg leading-normal text-muted">
            Este aviso explica quais informações o Quem Vota Comigo utiliza,
            para que elas servem, onde ficam e como você pode exercer seus
            direitos. O site funciona sem cadastro.
          </p>
        </header>

        <article className="grid min-w-0 gap-12 md:gap-14">
          <section
            aria-labelledby="titulo-dados"
            className="grid scroll-mt-24 gap-5"
            id="dados"
          >
            <h2
              className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-ink"
              id="titulo-dados"
            >
              Quais dados tratamos e para quê
            </h2>
            <dl className="divide-y divide-border border-y border-border">
              {dataGroups.map((group) => (
                <div
                  className="grid gap-2 py-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-6"
                  key={group.title}
                >
                  <dt className="font-[680] leading-snug text-ink">
                    {group.title}
                  </dt>
                  <dd className="max-w-[72ch] leading-normal text-muted">
                    {group.body}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="grid max-w-[72ch] gap-3 leading-normal text-muted">
              <h3 className="text-lg font-[680] text-ink">Bases legais</h3>
              <p>
                A medição de uso, a segurança e o diagnóstico de falhas se
                apoiam no legítimo interesse de manter e melhorar o serviço, com
                coleta reduzida e sem publicidade comportamental. Mensagens e
                pedidos são tratados para responder à solicitação, cumprir
                obrigações legais e exercer direitos.
              </p>
              <p>
                As posições políticas informadas na comparação são tratadas com
                seu consentimento específico, manifestado ao selecionar “Ver
                resultado” depois do aviso apresentado na revisão. Elas são
                usadas somente para gerar o resultado solicitado.
              </p>
            </div>
          </section>

          <section
            aria-labelledby="titulo-navegador"
            className="grid scroll-mt-24 gap-5"
            id="navegador"
          >
            <h2
              className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-ink"
              id="titulo-navegador"
            >
              O que fica no seu navegador
            </h2>
            <div className="grid max-w-[72ch] gap-4 leading-normal text-muted">
              <p>
                O rascunho da comparação, incluindo estado, proposições e
                respostas, fica no armazenamento da aba e é apagado quando você
                começa novamente ou encerra a sessão do navegador.
              </p>
              <p>
                A origem do primeiro acesso, como página de referência e
                parâmetros de campanha, pode ficar no armazenamento local até
                você apagar os dados do site. Ela não inclui suas respostas. As
                ferramentas de audiência não colocam cookies, e o Umami respeita
                a preferência “Não rastrear” do navegador.
              </p>
            </div>
            <BrowserDataControls />
          </section>

          <section
            aria-labelledby="titulo-fornecedores"
            className="grid scroll-mt-24 gap-5"
            id="fornecedores"
          >
            <h2
              className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-ink"
              id="titulo-fornecedores"
            >
              Fornecedores, compartilhamento e transferências
            </h2>
            <div className="grid max-w-[72ch] gap-4 leading-normal text-muted">
              <p>
                Não vendemos dados, não os fornecemos a corretores de dados e
                não compartilhamos informações de visitantes com partidos,
                campanhas ou candidatos. Dados podem ser apresentados a uma
                autoridade por obrigação legal ou ordem válida. Os fornecedores
                abaixo tratam dados conforme a função contratada.
              </p>
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {providerLinks.map((provider) => (
                <li
                  className="grid gap-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5"
                  key={provider.name}
                >
                  <SourceLink
                    href={provider.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {provider.name}
                  </SourceLink>
                  <span className="text-sm leading-normal text-muted">
                    {provider.purpose}
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid max-w-[72ch] gap-4 leading-normal text-muted">
              <p>
                Alguns desses fornecedores podem processar dados fora do Brasil
                e publicam seus compromissos de segurança e proteção para essas
                transferências.
              </p>
              <SourceLink
                href="https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados"
                rel="noopener noreferrer"
                target="_blank"
              >
                Entender transferências internacionais na ANPD
              </SourceLink>
            </div>
            <h3 className="text-lg font-[680] text-ink">
              Por quanto tempo guardamos os dados
            </h3>
            <ul className="grid max-w-[72ch] gap-3 pl-5 leading-normal text-muted [list-style:disc]">
              <li>
                O rascunho dura durante a sessão do navegador. A origem do
                primeiro acesso permanece no armazenamento local até você
                apagá-la.
              </li>
              <li>
                Os registros próprios de início e conclusão da comparação são
                mantidos como série histórica enquanto forem necessários para
                avaliar o projeto. Métricas de audiência, relatórios de erro e
                registros técnicos seguem as janelas dos respectivos
                fornecedores.
              </li>
              <li>
                Mensagens são mantidas pelo tempo necessário para resolver o
                pedido e cumprir obrigações legais. Dados parlamentares
                permanecem enquanto forem relevantes para a finalidade
                informativa ou para preservar o histórico público.
              </li>
            </ul>
          </section>

          <section
            aria-labelledby="titulo-direitos"
            className="grid scroll-mt-24 gap-5"
            id="direitos"
          >
            <h2
              className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-ink"
              id="titulo-direitos"
            >
              Seus direitos
            </h2>
            <div className="grid max-w-[72ch] gap-4 leading-normal text-muted">
              <p>
                Conforme o caso, você pode pedir confirmação e acesso aos seus
                dados, correção, informação sobre compartilhamentos,
                anonimização, bloqueio ou eliminação, além de se opor a um
                tratamento irregular e exercer os demais direitos previstos na
                LGPD.
              </p>
              <p>
                Como o site não usa conta nem identificador persistente de
                usuário, pode não ser possível relacionar uma métrica anônima a
                uma pessoa. Se isso ocorrer, explicaremos a limitação em vez de
                pedir mais dados do que o necessário.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              <SourceLink
                href="https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares"
                rel="noopener noreferrer"
                target="_blank"
              >
                Conhecer os direitos dos titulares
              </SourceLink>
              <SourceLink
                href="https://www.gov.br/anpd/pt-br/canais_atendimento/cidadao-titular-de-dados/denuncia-peticao-de-titular-referente-lgpd"
                rel="noopener noreferrer"
                target="_blank"
              >
                Consultar o canal da ANPD
              </SourceLink>
            </div>
          </section>

          <section
            aria-labelledby="titulo-contato"
            className="grid scroll-mt-24 gap-5"
            id="contato"
          >
            <h2
              className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-ink"
              id="titulo-contato"
            >
              Responsável e contato
            </h2>
            <p className="max-w-[72ch] leading-normal text-muted">
              Quem Vota Comigo é um projeto independente e administra os
              tratamentos descritos neste aviso. Para exercer seus direitos ou
              falar sobre privacidade, entre em contato pelo e-mail{" "}
              <a
                className={linkClassName}
                href="mailto:quemvotacomigo@gmail.com"
              >
                quemvotacomigo@gmail.com
              </a>
              .
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
