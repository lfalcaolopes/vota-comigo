import type { Metadata } from "next";

import { ButtonLink, Panel } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Deputados | Quem Vota Comigo",
  description:
    "Como consultar deputados federais no Quem Vota Comigo e interpretar perfis vinculados ao matcher.",
};

export default function DeputadosPage() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-200 gap-8 px-4 pt-8 pb-16 md:pt-12">
        <header className="grid max-w-[68ch] gap-4">
          <p className="text-sm font-[650] text-primary">Deputados</p>
          <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
            Perfis de deputados aparecem junto da comparação.
          </h1>
          <p className="text-base leading-normal text-muted">
            O MVP prioriza deputados federais com histórico de votação nominal
            computável. Os perfis ficam acessíveis a partir dos resultados do
            matcher e mostram contexto para interpretar compatibilidade.
          </p>
        </header>

        <Panel title="O que há no perfil">
          <div className="grid gap-3 leading-normal text-muted">
            <p>
              Cada perfil pode reunir nome público, partido, UF, atividade
              parlamentar, presença na amostra e histórico suficiente para
              comparação. Quando algum dado não existe na base, a interface deve
              dizer isso explicitamente.
            </p>
            <p>
              Deputados novos ou candidatos sem mandato federal podem não ter
              votos suficientes para uma comparação responsável.
            </p>
          </div>
        </Panel>

        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/matcher" variant="primary">
            Fazer comparação
          </ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Ver proposições
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
