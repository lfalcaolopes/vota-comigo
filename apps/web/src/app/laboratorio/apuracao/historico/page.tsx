import type { Metadata } from "next";
import Link from "next/link";

import { ProjecaoHistoryView } from "@/features/apuracao";
import { Panel } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Como a projeção se saiu",
  description:
    "A projeção do segundo turno presidencial de 2026 comparada, parcial a parcial, com a apuração oficial do TSE e com o resultado final.",
};

export default function ProjecaoHistoricoPage() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-200 gap-10 px-4 pt-8 pb-16 md:pt-12">
        <header className="grid max-w-[68ch] gap-4">
          <p className="text-sm font-[650] text-primary">
            <Link
              className="underline-offset-[0.18em] hover:underline"
              href="/laboratorio/apuracao"
            >
              Resultado do segundo turno
            </Link>
          </p>
          <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
            Como a projeção se saiu na apuração
          </h1>
        </header>

        <ProjecaoHistoryView />

        <Panel title="Como a projeção funcionava" titleAs="h2">
          <div className="grid gap-4 text-sm leading-normal text-muted">
            <ol className="grid list-decimal gap-2 pl-5">
              <li>
                O ponto de partida era o resultado de cada município no 1º
                turno, contando só os votos dos dois candidatos que foram ao 2º.
              </li>
              <li>
                Nos municípios que já tinham urnas apuradas, a projeção media
                quanto cada candidato tinha ganhado ou perdido em relação ao 1º
                turno naquele mesmo lugar.
              </li>
              <li>
                Essa variação era aplicada aos votos que faltavam. Cada estado
                usava a sua, puxada para a variação nacional enquanto tinha
                poucos votos apurados.
              </li>
              <li>
                O total de votos de cada município era o do 1º turno. A cada
                parcial do TSE, a conta era refeita com tudo o que já tinha sido
                apurado.
              </li>
            </ol>
            <p>
              A página gravou a parcial oficial e a projeção cada vez que a
              apuração passava de um múltiplo de 5% das urnas. A gravação
              começou com 9% das urnas apuradas, por isso não há pontos antes
              disso.
            </p>
          </div>
        </Panel>
      </div>
    </main>
  );
}
