import { Disclosure } from "@/shared/ui";

import { formatPercent, formatUfLabel } from "../lib/apuracao-presentation";
import type { ResultadoUf } from "../lib/resultado-apuracao";

type UfTableProps = {
  nomeA: string;
  nomeB: string;
  ufs: ResultadoUf[];
};

export function UfTable({ nomeA, nomeB, ufs }: UfTableProps) {
  return (
    <Disclosure summary="Ver os números de cada estado">
      <div className="overflow-x-auto">
        <table className="w-full min-w-80 text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-2 font-[650]" scope="col">
                Estado
              </th>
              <th className="py-2 text-right font-[650]" scope="col">
                {nomeA}
              </th>
              <th className="py-2 text-right font-[650]" scope="col">
                {nomeB}
              </th>
            </tr>
          </thead>
          <tbody>
            {ufs.map((uf) => (
              <tr className="border-t border-border" key={uf.siglaUf}>
                <th className="py-2 text-left font-[650] text-ink" scope="row">
                  {formatUfLabel(uf.siglaUf)}
                </th>
                <td className="py-2 text-right text-ink tabular-nums">
                  {formatPercent(uf.shareA)}
                </td>
                <td className="py-2 text-right text-ink tabular-nums">
                  {formatPercent(1 - uf.shareA)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Disclosure>
  );
}
