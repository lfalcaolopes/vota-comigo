import { Disclosure } from "@/shared/ui";

import { formatPercent } from "../lib/apuracao-presentation";
import type { ProjecaoSnapshot } from "../lib/projecao-history";

type ProjecaoHistoryTableProps = {
  nomeA: string;
  snapshots: ProjecaoSnapshot[];
  finalShareA: number;
  finalUrnasApuradas: number;
  finalTseUpdatedAt: string;
};

function toHora(tseUpdatedAt: string): string {
  return tseUpdatedAt.split(" ")[1]?.slice(0, 5) ?? tseUpdatedAt;
}

export function ProjecaoHistoryTable({
  nomeA,
  snapshots,
  finalShareA,
  finalUrnasApuradas,
  finalTseUpdatedAt,
}: ProjecaoHistoryTableProps) {
  return (
    <Disclosure summary="Ver todas as parciais gravadas">
      <div className="overflow-x-auto">
        <table className="w-full min-w-80 text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-2 font-[650]" scope="col">
                Urnas apuradas
              </th>
              <th className="py-2 font-[650]" scope="col">
                Hora
              </th>
              <th className="py-2 text-right font-[650]" scope="col">
                {nomeA} na parcial
              </th>
              <th className="py-2 text-right font-[650]" scope="col">
                {nomeA} na projeção
              </th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr
                className="border-t border-border"
                key={snapshot.urnasApuradas}
              >
                <th
                  className="py-2 text-left font-[650] text-ink tabular-nums"
                  scope="row"
                >
                  {formatPercent(snapshot.urnasApuradas / 100, 2)}
                </th>
                <td className="py-2 text-muted tabular-nums">
                  {toHora(snapshot.tseUpdatedAt)}
                </td>
                <td className="py-2 text-right text-ink tabular-nums">
                  {formatPercent(snapshot.oficialShareA, 2)}
                </td>
                <td className="py-2 text-right text-ink tabular-nums">
                  {formatPercent(snapshot.projecaoShareA, 2)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border-strong">
              <th
                className="py-2 text-left font-[650] text-ink tabular-nums"
                scope="row"
              >
                {formatPercent(finalUrnasApuradas / 100, 2)}
              </th>
              <td className="py-2 text-muted tabular-nums">
                {toHora(finalTseUpdatedAt)}
              </td>
              <td className="py-2 text-right font-[650] text-ink tabular-nums">
                {formatPercent(finalShareA, 2)}
              </td>
              <td className="py-2 text-right text-muted">resultado final</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Disclosure>
  );
}
