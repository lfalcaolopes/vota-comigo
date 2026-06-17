import type { Metadata } from "next";

import { ButtonLink, Panel, SourceLink } from "@/shared/ui";

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
            Compatibilidade precisa vir acompanhada de método.
          </h1>
          <p className="text-base leading-normal text-muted">
            O matcher compara posições declaradas com votos nominais de
            deputados federais. A leitura correta depende de amostra, presença e
            casos excluídos do denominador.
          </p>
        </header>

        <div className="grid gap-4">
          <Panel title="Fonte dos dados">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                A base vem dos Dados Abertos da Câmara dos Deputados. O produto
                preserva identificadores oficiais quando referencia campos da
                fonte e mostra links para consulta quando há detalhe público
                disponível.
              </p>
              <SourceLink href="https://dadosabertos.camara.leg.br/" target="_blank">
                Dados Abertos da Câmara dos Deputados
              </SourceLink>
            </div>
          </Panel>

          <Panel title="Como a comparação é lida">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                Para cada proposição selecionada, sua posição é comparada com o
                voto registrado do deputado quando a votação é computável. A
                compatibilidade considera apenas os casos em que há posição do
                usuário e voto comparável.
              </p>
              <p>
                Ausências, obstruções, votações sem correspondência e deputados
                sem histórico suficiente reduzem a amostra. Por isso, o
                resultado precisa ser lido junto do total de itens comparados.
              </p>
            </div>
          </Panel>

          <Panel title="Neutralidade">
            <div className="grid gap-3 leading-normal text-muted">
              <p>
                O produto não usa partido como atalho para compatibilidade e não
                promove candidato. O objetivo é tornar o comportamento em
                votação mais verificável, com linguagem comum e fonte pública.
              </p>
            </div>
          </Panel>
        </div>

        <ButtonLink className="justify-self-start" href="/" variant="secondary">
          Ver proposições
        </ButtonLink>
      </div>
    </main>
  );
}
