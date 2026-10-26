import type { Metadata } from "next";

import {
  buildUfShapes,
  MAPA_HEIGHT,
  MAPA_WIDTH,
  ResultadoView,
} from "@/features/apuracao";
import { Panel, SourceLink } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Resultado do segundo turno",
  description:
    "Resultado do segundo turno presidencial de 2026 por estado, com a projeção que esta página fez durante a apuração do TSE.",
};

export default function ApuracaoPage() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-200 gap-10 px-4 pt-8 pb-16 md:pt-12">
        <header className="grid max-w-[68ch] gap-4">
          <p className="text-sm font-[650] text-primary">Laboratório</p>
          <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
            Resultado do segundo turno
          </h1>
        </header>

        <ResultadoView
          mapaHeight={MAPA_HEIGHT}
          mapaWidth={MAPA_WIDTH}
          shapes={buildUfShapes()}
        />

        <Panel title="Como ler" titleAs="h2">
          <div className="grid gap-4 text-sm leading-normal text-muted">
            <ul className="grid list-disc gap-2 pl-5">
              <li>
                As porcentagens contam só os votos nos dois candidatos, sem
                brancos e nulos.
              </li>
              <li>
                Os números são a última leitura do TSE guardada por esta página.
                O resultado oficial é o publicado pelo TSE.
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
