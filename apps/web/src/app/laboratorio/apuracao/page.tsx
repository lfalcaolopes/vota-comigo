import type { Metadata } from "next";

import {
  ApuracaoAoVivo,
  buildUfShapes,
  MAPA_HEIGHT,
  MAPA_WIDTH,
} from "@/features/apuracao";
import { Panel, SourceLink } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Projeção da apuração",
  description:
    "Projeção ao vivo do resultado final do segundo turno presidencial de 2026, calculada a partir da apuração parcial do TSE.",
};

export default function ApuracaoPage() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-200 gap-10 px-4 pt-8 pb-16 md:pt-12">
        <header className="grid max-w-[68ch] gap-4">
          <p className="text-sm font-[650] text-primary">Laboratório</p>
          <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
            Projeção da apuração do segundo turno
          </h1>
          <p className="text-base leading-normal text-muted">
            Estimativa do resultado final, recalculada a cada parcial do TSE.
          </p>
        </header>

        <ApuracaoAoVivo
          mapaHeight={MAPA_HEIGHT}
          mapaWidth={MAPA_WIDTH}
          shapes={buildUfShapes()}
        />

        <Panel title="Como ler" titleAs="h2">
          <div className="grid gap-4 text-sm leading-normal text-muted">
            <ul className="grid list-disc gap-2 pl-5">
              <li>É uma estimativa, não um resultado.</li>
              <li>
                Capitais e alguns estados terminam de apurar antes, por isso a
                parcial oficial engana no começo da noite.
              </li>
              <li>
                Cada município ainda não apurado recebe o resultado do 1º turno,
                corrigido pela variação já vista nos apurados. Estados com
                poucos votos apurados seguem mais a variação nacional.
              </li>
              <li>
                Supomos o mesmo comparecimento do 1º turno e contamos só os dois
                candidatos, sem brancos e nulos.
              </li>
              <li>
                Experimento fora do escopo principal do site, que trata do
                mandato dos deputados federais.
              </li>
            </ul>
            <SourceLink
              href="https://resultados.tse.jus.br/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Resultados oficiais do TSE
            </SourceLink>
          </div>
        </Panel>
      </div>
    </main>
  );
}
