"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatPercent } from "../lib/apuracao-presentation";
import type { ProjecaoSnapshot } from "../lib/projecao-history";

type ProjecaoHistoryChartProps = {
  nomeA: string;
  nomeB: string;
  snapshots: ProjecaoSnapshot[];
  finalShareA: number;
  finalUrnasApuradas: number;
  tolerance: number;
  liderContrario: { from: number; to: number } | null;
};

type SeriesLabelProps = {
  x?: number | string;
  y?: number | string;
  index?: number;
};

const formatAxisPercent = (value: number) =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

// Only the first point gets a label: there the two lines are far enough apart to name them in place.
function firstPointLabel(text: string, color: string, dy: number) {
  function FirstPointLabel({ x, y, index }: SeriesLabelProps) {
    if (index !== 0 || x === undefined || y === undefined) return null;
    return (
      <text
        className="text-xs font-[650]"
        dy={dy}
        fill={color}
        x={Number(x)}
        y={Number(y)}
      >
        {text}
      </text>
    );
  }
  return FirstPointLabel;
}

export function ProjecaoHistoryChart({
  nomeA,
  nomeB,
  snapshots,
  finalShareA,
  finalUrnasApuradas,
  tolerance,
  liderContrario,
}: ProjecaoHistoryChartProps) {
  const data = [
    ...snapshots.map((snapshot) => ({
      urnasApuradas: snapshot.urnasApuradas,
      projecao: snapshot.projecaoShareA * 100,
      oficial: snapshot.oficialShareA * 100,
    })),
    { urnasApuradas: finalUrnasApuradas, oficial: finalShareA * 100 },
  ];
  const values = data.flatMap((point) =>
    "projecao" in point ? [point.projecao, point.oficial] : [point.oficial],
  );
  const yMin = Math.floor(Math.min(...values, 50) - 0.5);
  const yMax = Math.ceil(Math.max(...values, (finalShareA + tolerance) * 100));
  const yTicks = Array.from(
    { length: yMax - yMin + 1 },
    (_, index) => yMin + index,
  );

  return (
    <figure className="grid gap-3">
      <div
        aria-label={`Gráfico: ${nomeA} na projeção e na parcial oficial conforme as urnas eram apuradas, com o resultado final de ${formatPercent(finalShareA)} como referência. A tabela abaixo traz os mesmos números.`}
        className="h-80 w-full md:h-[26rem]"
        role="img"
      >
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data} margin={{ left: 0, right: 12, top: 16 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            {liderContrario ? (
              <ReferenceArea
                fill="var(--color-series-b)"
                fillOpacity={0.09}
                ifOverflow="hidden"
                label={{
                  value: `${nomeB.split(" ")[0]} à frente`,
                  position: "insideBottom",
                  fill: "var(--color-series-b)",
                  fontSize: 12,
                  fontWeight: 650,
                }}
                x1={liderContrario.from}
                x2={liderContrario.to}
                y1={yMin}
                y2={50}
              />
            ) : null}
            <ReferenceArea
              fill="var(--color-ink)"
              fillOpacity={0.06}
              label={{
                value: `Resultado final, ${formatPercent(finalShareA)}`,
                position: "insideTopRight",
                fill: "var(--color-ink)",
                fontSize: 12,
                fontWeight: 650,
              }}
              y1={(finalShareA - tolerance) * 100}
              y2={(finalShareA + tolerance) * 100}
            />
            <ReferenceLine
              stroke="var(--color-ink)"
              strokeWidth={1}
              y={finalShareA * 100}
            />
            <ReferenceLine
              label={{
                value: "50%",
                position: "insideBottomRight",
                fill: "var(--color-muted)",
                fontSize: 12,
              }}
              stroke="var(--color-border-strong)"
              strokeDasharray="2 3"
              y={50}
            />
            <XAxis
              dataKey="urnasApuradas"
              domain={[0, 100]}
              stroke="var(--color-subtle)"
              tickFormatter={(value: number) => `${value}%`}
              ticks={[0, 25, 50, 75, 100]}
              type="number"
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke="var(--color-subtle)"
              tickFormatter={formatAxisPercent}
              ticks={yTicks}
              width={44}
            />
            <Tooltip
              formatter={(value) =>
                `${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
              }
              labelFormatter={(value) =>
                `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% das urnas`
              }
            />
            <Line
              activeDot={{ r: 4 }}
              dataKey="oficial"
              dot={{ r: 2.5, fill: "var(--color-muted)", strokeWidth: 0 }}
              isAnimationActive={false}
              label={firstPointLabel(
                "Parcial oficial",
                "var(--color-muted)",
                -10,
              )}
              name="Parcial oficial"
              stroke="var(--color-muted)"
              strokeDasharray="5 4"
              strokeWidth={2}
            />
            <Line
              activeDot={{ r: 5 }}
              dataKey="projecao"
              dot={{ r: 3, fill: "var(--color-series-a)", strokeWidth: 0 }}
              isAnimationActive={false}
              label={firstPointLabel("Projeção", "var(--color-series-a)", -10)}
              name="Projeção"
              stroke="var(--color-series-a)"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="max-w-[68ch] text-sm leading-normal text-muted">
        Fatia de {nomeA} nos votos válidos. A faixa cinza vai de{" "}
        {formatPercent(finalShareA - tolerance)} a{" "}
        {formatPercent(finalShareA + tolerance)}, meio ponto para cada lado do
        resultado final.
      </figcaption>
    </figure>
  );
}
