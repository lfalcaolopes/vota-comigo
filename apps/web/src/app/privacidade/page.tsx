import type { Metadata } from "next";

import { Panel, SourceLink } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Como o Quem Vota Comigo trata os dados usados pelo site.",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-200 gap-12 px-4 pt-8 pb-16 md:pt-12">
        <header className="grid max-w-[68ch] gap-4">
          <p className="text-sm font-[650] text-primary">Privacidade</p>
          <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
            Como tratamos os dados usados pelo site.
          </h1>
          <p className="text-base leading-normal text-muted">
            Este aviso explica quais informações utilizamos, para que elas
            servem e como você pode exercer seus direitos. O site não exige
            cadastro para consultas ou comparações.
          </p>
          <p className="text-sm leading-normal text-subtle">
            Última atualização: setembro de 2026.
          </p>
        </header>

        <section aria-labelledby="grupo-privacidade" className="grid gap-4">
          <h2
            className="text-sm font-[650] tracking-wide text-subtle uppercase"
            id="grupo-privacidade"
          >
            Tratamento de dados
          </h2>

          <Panel title="Dados de acesso" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Tratamos dados de navegação e de origem do acesso para medir o
                uso do site, entender como ele é encontrado, identificar falhas
                e melhorar o serviço. Também registramos quando uma comparação é
                iniciada ou concluída. Esse tratamento se baseia no legítimo
                interesse em avaliar e manter o funcionamento do projeto.
              </p>
            </div>
          </Panel>

          <Panel title="Dados da comparação" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                As escolhas e respostas da comparação são processadas apenas
                para calcular e apresentar o resultado. Elas não são incluídas
                nos registros usados para medir acessos, inícios ou conclusões.
              </p>
            </div>
          </Panel>

          <Panel title="Armazenamento e compartilhamento" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Os dados são mantidos pelo tempo necessário às finalidades deste
                aviso e podem ser processados por fornecedores de hospedagem,
                análise de uso e monitoramento técnico. Parte do processamento
                pode ocorrer fora do Brasil, observados os artigos 33 a 36 da
                LGPD e a Resolução CD/ANPD nº 19/2024.
              </p>
              <p>
                Não vendemos dados de acesso nem os compartilhamos com partidos,
                campanhas ou candidatos.
              </p>
              <SourceLink
                href="https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados"
                rel="noopener noreferrer"
                target="_blank"
              >
                Transferência internacional de dados na ANPD
              </SourceLink>
            </div>
          </Panel>

          <Panel title="Seus direitos e contato" titleAs="h3">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Você pode solicitar informações sobre o tratamento, acesso,
                correção ou eliminação de dados aplicáveis ao seu caso, além de
                exercer os demais direitos previstos na Lei Geral de Proteção de
                Dados Pessoais (LGPD). O Quem Vota Comigo é responsável pelas
                decisões sobre esse tratamento.
              </p>
              <SourceLink href="mailto:lfalcaolopes.dev@gmail.com">
                Falar sobre privacidade
              </SourceLink>
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}
