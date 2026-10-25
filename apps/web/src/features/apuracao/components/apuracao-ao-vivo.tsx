"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Disclosure, InlineMessage, Skeleton } from "@/shared/ui";

import type { ApuracaoHistoryPoint } from "../hooks/use-apuracao-snapshot";
import { useApuracaoSnapshot } from "../hooks/use-apuracao-snapshot";
import {
  formatNomeCandidato,
  formatPercent,
  formatUfLabel,
} from "../lib/apuracao-presentation";
import type { UfShape } from "../lib/mapa-ufs";
import type { ProjecaoUf } from "../lib/projecao-apuracao";
import { ProjecaoSummary } from "./projecao-summary";
import { UfMapa } from "./uf-mapa";

function StatusLine({
  tseUpdatedAt,
  urnasApuradas,
}: {
  tseUpdatedAt: string;
  urnasApuradas: number;
}) {
  const hora = tseUpdatedAt.split(" ")[1]?.slice(0, 5) ?? tseUpdatedAt;
  const urnasLabel = urnasApuradas.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
      <span className="inline-flex items-center gap-2 font-[650] text-ink">
        <span className="relative inline-flex size-2">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full bg-danger opacity-60 motion-reduce:animate-none"
          />
          <span className="relative inline-flex size-2 rounded-full bg-danger" />
        </span>
        Ao vivo
      </span>
      <span className="tabular-nums">{urnasLabel}% das urnas apuradas</span>
      <span>Parcial do TSE às {hora}</span>
    </p>
  );
}

function HistoryChart({
  history,
  nomeA,
}: {
  history: ApuracaoHistoryPoint[];
  nomeA: string;
}) {
  return (
    <section aria-labelledby="historico-projecao" className="grid gap-3">
      <div className="grid gap-1">
        <h2
          className="text-lg leading-snug font-[680] text-ink"
          id="historico-projecao"
        >
          {nomeA} na projeção e na apuração
        </h2>
        <p className="text-sm text-muted">
          Desde que você abriu esta página, conforme as urnas são apuradas.
        </p>
      </div>
      <div className="h-56 w-full rounded-lg border border-border bg-surface p-3 md:h-64">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={history} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="urnasApuradas"
              domain={["dataMin", "dataMax"]}
              stroke="var(--color-subtle)"
              tickFormatter={(value: number) => `${value}%`}
              type="number"
            />
            <YAxis
              domain={["auto", "auto"]}
              stroke="var(--color-subtle)"
              tickFormatter={(value: number) =>
                `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
              }
              width={56}
            />
            <Tooltip
              formatter={(value) =>
                `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
              }
              labelFormatter={(value) => `${value}% das urnas`}
            />
            <Line
              dataKey="projecao"
              dot={false}
              isAnimationActive={false}
              name="Projeção"
              stroke="var(--color-series-a)"
              strokeWidth={2.5}
            />
            <Line
              dataKey="oficial"
              dot={false}
              isAnimationActive={false}
              name="Apuração oficial"
              stroke="var(--color-subtle)"
              strokeDasharray="4 4"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-0.5 w-5 bg-series-a" />
          Projeção
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-0 w-5 border-t-2 border-dashed border-subtle"
          />
          Apuração oficial
        </span>
      </p>
    </section>
  );
}

function UfTable({
  nomeA,
  nomeB,
  ufs,
  urnasApuradasByUf,
}: {
  nomeA: string;
  nomeB: string;
  ufs: ProjecaoUf[];
  urnasApuradasByUf: Record<string, number>;
}) {
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
                Apuradas
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
                <td className="py-2 text-right text-muted tabular-nums">
                  {formatPercent((urnasApuradasByUf[uf.siglaUf] ?? 0) / 100)}
                </td>
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

type ApuracaoAoVivoProps = {
  shapes: UfShape[];
  mapaWidth: number;
  mapaHeight: number;
};

export function ApuracaoAoVivo({
  shapes,
  mapaWidth,
  mapaHeight,
}: ApuracaoAoVivoProps) {
  const { snapshot, failed, history } = useApuracaoSnapshot();

  if (!snapshot) {
    return failed ? (
      <InlineMessage
        body="A página tenta de novo a cada minuto."
        title="Não foi possível ler a apuração do TSE agora."
        tone="warning"
      />
    ) : (
      <div className="grid gap-6">
        <Skeleton className="h-72" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const nomeA = formatNomeCandidato(snapshot.candidatoA.nome);
  const nomeB = formatNomeCandidato(snapshot.candidatoB.nome);

  return (
    <div className="grid gap-10">
      <div className="grid gap-4">
        <StatusLine
          tseUpdatedAt={snapshot.tseUpdatedAt}
          urnasApuradas={snapshot.urnasApuradas}
        />
        {failed ? (
          <InlineMessage
            body="Os números abaixo são da última leitura que deu certo. A página tenta de novo a cada minuto."
            title="A atualização mais recente falhou."
            tone="warning"
          />
        ) : null}
        <ProjecaoSummary
          nomeA={nomeA}
          nomeB={nomeB}
          oficialShareA={snapshot.oficialShareA}
          projecaoShareA={snapshot.projecao.shareA}
          urnasApuradas={snapshot.urnasApuradas}
        />
      </div>

      <div className="grid gap-4">
        <UfMapa
          mapaHeight={mapaHeight}
          mapaWidth={mapaWidth}
          nomeA={nomeA}
          nomeB={nomeB}
          shapes={shapes}
          ufs={snapshot.projecao.ufs}
          urnasApuradasByUf={snapshot.urnasApuradasByUf}
          variacaoEntreTurnos={snapshot.projecao.variacaoEntreTurnos}
        />
        <UfTable
          nomeA={nomeA}
          nomeB={nomeB}
          ufs={snapshot.projecao.ufs}
          urnasApuradasByUf={snapshot.urnasApuradasByUf}
        />
      </div>

      {history.length > 1 ? (
        <HistoryChart history={history} nomeA={nomeA} />
      ) : null}
    </div>
  );
}
