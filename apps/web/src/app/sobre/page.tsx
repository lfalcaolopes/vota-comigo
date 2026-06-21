import type { Metadata } from "next";

import { ButtonLink, Panel } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Sobre | Quem Vota Comigo",
  description:
    "O que o Quem Vota Comigo compara, de onde vêm os dados e quais limites devem ser considerados.",
};

export default function SobrePage() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-200 gap-8 px-4 pt-8 pb-16 md:pt-12">
        <header className="grid max-w-[68ch] gap-4">
          <p className="text-sm font-[650] text-primary">Sobre</p>
          <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
            Compare suas posições com votos reais da Câmara.
          </h1>
          <p className="text-base leading-normal text-muted">
            O Quem Vota Comigo ajuda cidadãos a entender como deputados federais
            votaram em proposições nominais e como esse histórico se aproxima
            das posições declaradas por você.
          </p>
        </header>

        <Panel title="O que o produto faz">
          <div className="grid gap-3 leading-normal text-muted">
            <p>
              A comparação usa votações nominais da Câmara dos Deputados,
              proposições computáveis pelo matcher e dados públicos de deputados
              federais. O resultado mostra compatibilidade, amostra e presença
              para evitar que um percentual apareça sem contexto.
            </p>
            <p>
              O produto não recomenda voto nem classifica parlamentares como
              certos ou errados. Ele organiza evidências públicas para que cada
              pessoa avalie representação, prioridades e limites da base.
            </p>
          </div>
        </Panel>

        <Panel title="Limites importantes">
          <div className="grid gap-3 leading-normal text-muted">
            <p>
              Candidatos sem histórico na Câmara, cargos fora da Câmara dos
              Deputados e votações sem dado computável podem ficar fora da
              comparação. Amostras pequenas devem ser lidas com cautela.
            </p>
            <p>
              Resultados públicos podem ser compartilhados sem expor dados
              pessoais. A comparação depende das posições informadas durante o
              fluxo, não de cadastro.
            </p>
          </div>
        </Panel>

        <ButtonLink
          className="justify-self-start"
          href="/matcher"
          variant="primary"
        >
          Fazer comparação
        </ButtonLink>
      </div>
    </main>
  );
}
