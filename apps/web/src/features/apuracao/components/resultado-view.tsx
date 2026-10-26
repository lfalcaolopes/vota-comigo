import Link from "next/link";

import {
  formatNomeCandidato,
  formatPercent,
  formatUrnas,
} from "../lib/apuracao-presentation";
import type { UfShape } from "../lib/mapa-ufs";
import { projecaoSnapshots } from "../lib/projecao-history";
import { resultadoFinal } from "../lib/resultado-apuracao";
import { ResultadoSummary } from "./resultado-summary";
import { UfMapa } from "./uf-mapa";
import { UfTable } from "./uf-table";

const PROJECAO_HISTORY_HREF = "/laboratorio/apuracao/historico";

type ResultadoViewProps = {
  shapes: UfShape[];
  mapaWidth: number;
  mapaHeight: number;
};

export function ResultadoView({
  shapes,
  mapaWidth,
  mapaHeight,
}: ResultadoViewProps) {
  const nomeA = formatNomeCandidato(resultadoFinal.candidatoA.nome);
  const nomeB = formatNomeCandidato(resultadoFinal.candidatoB.nome);
  const primeira = projecaoSnapshots[0];

  return (
    <div className="grid gap-10">
      <div className="grid gap-4">
        <ResultadoSummary
          nomeA={nomeA}
          nomeB={nomeB}
          resultado={resultadoFinal}
        />
        {primeira ? (
          <p className="max-w-[68ch] text-base leading-normal text-muted">
            Durante a apuração, esta página projetou o resultado final a partir
            das parciais do TSE. Com {formatUrnas(primeira.urnasApuradas)} das
            urnas, a projeção já marcava {nomeA} com{" "}
            {formatPercent(primeira.projecaoShareA)}.{" "}
            <Link
              className="font-[650] text-ink underline decoration-ink/45 underline-offset-[0.18em] transition-[text-decoration-color] duration-[180ms] ease-standard hover:decoration-ink"
              href={PROJECAO_HISTORY_HREF}
            >
              Ver como a projeção se saiu ao longo da noite
            </Link>
          </p>
        ) : null}
      </div>

      <div className="grid gap-4">
        <UfMapa
          mapaHeight={mapaHeight}
          mapaWidth={mapaWidth}
          nomeA={nomeA}
          nomeB={nomeB}
          shapes={shapes}
          ufs={resultadoFinal.ufs}
        />
        <UfTable nomeA={nomeA} nomeB={nomeB} ufs={resultadoFinal.ufs} />
      </div>
    </div>
  );
}
