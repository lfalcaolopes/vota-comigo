import { formatNomeCandidato } from "../lib/apuracao-presentation";
import {
  describeProjecaoHistory,
  findLiderContrario,
  projecaoSnapshots,
} from "../lib/projecao-history";
import { resultadoFinal } from "../lib/resultado-apuracao";
import { ProjecaoHistoryChart } from "./projecao-history-chart";
import { ProjecaoHistoryTable } from "./projecao-history-table";

// Half a point either side of the final share counts as "close to the result".
const TOLERANCE = 0.005;

export function ProjecaoHistoryView() {
  const nomeA = formatNomeCandidato(resultadoFinal.candidatoA.nome);
  const nomeB = formatNomeCandidato(resultadoFinal.candidatoB.nome);
  const frases = describeProjecaoHistory(
    projecaoSnapshots,
    resultadoFinal.shareA,
    TOLERANCE,
    nomeA,
    nomeB,
  );

  return (
    <div className="grid gap-8">
      <div className="grid max-w-[62ch] gap-3 text-lg leading-normal text-ink">
        <p>{frases.projecao}</p>
        <p className="text-muted">{frases.oficial}</p>
      </div>

      <ProjecaoHistoryChart
        finalShareA={resultadoFinal.shareA}
        finalUrnasApuradas={resultadoFinal.urnasApuradas}
        liderContrario={findLiderContrario(
          projecaoSnapshots,
          "oficialShareA",
          resultadoFinal.shareA,
        )}
        nomeA={nomeA}
        nomeB={nomeB}
        snapshots={projecaoSnapshots}
        tolerance={TOLERANCE}
      />

      <ProjecaoHistoryTable
        finalShareA={resultadoFinal.shareA}
        finalTseUpdatedAt={resultadoFinal.tseUpdatedAt}
        finalUrnasApuradas={resultadoFinal.urnasApuradas}
        nomeA={nomeA}
        snapshots={projecaoSnapshots}
      />
    </div>
  );
}
