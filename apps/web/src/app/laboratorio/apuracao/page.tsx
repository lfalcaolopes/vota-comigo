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
            Capitais e alguns estados terminam a apuração antes, então a parcial
            oficial engana no começo da noite. A projeção completa cada
            município ainda não apurado com o resultado dele no primeiro turno,
            corrigido pela variação já vista nos municípios apurados.
          </p>
        </header>

        <ApuracaoAoVivo
          mapaHeight={MAPA_HEIGHT}
          mapaWidth={MAPA_WIDTH}
          shapes={buildUfShapes()}
        />

        <Panel title="Como ler" titleAs="h2">
          <div className="grid gap-3 text-sm leading-normal text-muted">
            <p>
              É uma estimativa, não um resultado. Com poucas urnas apuradas, ela
              muda bastante; fica mais estável depois de uns 10% das urnas.
            </p>
            <p>
              Supomos que cada município terá o mesmo comparecimento do primeiro
              turno e comparamos só os dois candidatos do segundo turno, sem
              brancos e nulos. A variação de cada estado é puxada para a média
              nacional enquanto o estado tem poucos votos apurados.
            </p>
            <p>
              Este experimento fica fora do escopo principal do site, que trata
              do mandato dos deputados federais.
            </p>
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
