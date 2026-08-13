"use client";

import type {
  DeputadoCeapCategory,
  DeputadoCeapMonth,
} from "@vota-comigo/shared-types";
import { useReducer } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { deriveGastoCotaDistribuicaoMensal } from "./gasto-cota-distribuicao-mensal";
import { applyGastoCotaPaleta } from "./gasto-cota-paleta";
import { formatGastoCotaAmount } from "./gasto-cota-presentation";
import {
  gastoCotaSelecaoMensalInicial,
  getGastoCotaPontoMensalAtivo,
  reduceGastoCotaSelecaoMensal,
} from "./gasto-cota-selecao-mensal";

const monthLabels = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export function GastoCotaDistribuicaoMensal({
  categories,
  months,
  totalAmountUsedCents,
  year,
}: {
  categories: readonly DeputadoCeapCategory[];
  months: readonly DeputadoCeapMonth[];
  totalAmountUsedCents: number;
  year: number;
}) {
  const distribuicao = deriveGastoCotaDistribuicaoMensal(categories, months);
  const series = applyGastoCotaPaleta(distribuicao.series);
  const chartData = distribuicao.months.map((month) => ({
    coveredZero:
      month.totalAmountUsedCents === 0 && month.categories.length === 0
        ? 0
        : null,
    month: month.month,
    monthLabel: monthLabels[month.month - 1],
    ...Object.fromEntries(
      series.map((_, index) => [
        `serie-${index}`,
        month.amountUsedCentsBySeries?.[index] ?? null,
      ]),
    ),
  }));
  const [selecao, dispatchSelecao] = useReducer(
    reduceGastoCotaSelecaoMensal,
    gastoCotaSelecaoMensalInicial,
  );
  const activePoint = getGastoCotaPontoMensalAtivo(selecao);
  const activeMonth =
    activePoint === null ? null : distribuicao.months[activePoint.monthIndex];
  const activeSerie =
    activePoint === null ? null : series[activePoint.seriesIndex];
  const activeAmount =
    activePoint === null || activeMonth?.amountUsedCentsBySeries === null
      ? null
      : (activeMonth?.amountUsedCentsBySeries[activePoint.seriesIndex] ?? null);

  return (
    <section
      aria-labelledby="gasto-cota-mensal-title"
      className="grid gap-4 border-t border-border pt-5"
    >
      <div className="grid gap-1">
        <h4
          className="text-base font-[680] leading-snug text-ink"
          id="gasto-cota-mensal-title"
        >
          Gastos por mês
        </h4>
        <p className="max-w-[65ch] text-sm leading-normal text-muted">
          Escala em valores absolutos. Compensações e cancelamentos aparecem
          abaixo da linha de zero. Meses cobertos sem registro aparecem em zero.
        </p>
      </div>

      <figure
        aria-label={`Gráfico de barras empilhadas dos gastos mensais em ${year}`}
        className="grid min-w-0 gap-4"
        onMouseLeave={() => dispatchSelecao({ type: "clear-preview" })}
      >
        <div className="h-72 min-w-0 w-full">
          <ResponsiveContainer height="100%" minWidth={0} width="100%">
            <BarChart
              accessibilityLayer
              barCategoryGap="24%"
              data={chartData}
              margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
              stackOffset="sign"
            >
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="monthLabel"
                height={0}
                interval={0}
                tick={false}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                tickFormatter={formatCompactAmount}
                tickLine={false}
                width={52}
              />
              <ReferenceLine stroke="var(--color-border-strong)" y={0} />
              <Bar
                dataKey="coveredZero"
                fill="var(--color-border-strong)"
                isAnimationActive={false}
                legendType="none"
                minPointSize={3}
                name="Mês sem gastos"
                stackId="gastos"
              >
                {distribuicao.months.map((month) => (
                  <Cell
                    fillOpacity={
                      month.totalAmountUsedCents === 0 &&
                      month.categories.length === 0
                        ? 1
                        : 0
                    }
                    key={month.month}
                    pointerEvents="none"
                  />
                ))}
              </Bar>
              {series.map((serie, index) => (
                <Bar
                  dataKey={`serie-${index}`}
                  fill={serie.color}
                  isAnimationActive={false}
                  key={serie.externalNumSubCota ?? "outras-despesas"}
                  name={serie.description}
                  onBlur={() => dispatchSelecao({ type: "clear-preview" })}
                  onClick={(_, monthIndex) =>
                    dispatchSelecao({
                      type: "pin",
                      point: { monthIndex, seriesIndex: index },
                    })
                  }
                  onFocus={(_, monthIndex) =>
                    dispatchSelecao({
                      type: "preview",
                      point: { monthIndex, seriesIndex: index },
                    })
                  }
                  onKeyDown={(_, monthIndex, event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    dispatchSelecao({
                      type: "pin",
                      point: { monthIndex, seriesIndex: index },
                    });
                  }}
                  onMouseEnter={(_, monthIndex) =>
                    dispatchSelecao({
                      type: "preview",
                      point: { monthIndex, seriesIndex: index },
                    })
                  }
                  stackId="gastos"
                  tabIndex={0}
                >
                  {distribuicao.months.map((month, monthIndex) => (
                    <Cell
                      className="transition-opacity duration-200 motion-reduce:transition-none"
                      key={month.month}
                      opacity={
                        activePoint === null ||
                        (activePoint.monthIndex === monthIndex &&
                          activePoint.seriesIndex === index)
                          ? 1
                          : 0.42
                      }
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          aria-hidden="true"
          className="mr-1 ml-[52px] grid grid-cols-12 gap-1"
        >
          {distribuicao.months.map((month) => (
            <span
              className={
                month.totalAmountUsedCents === null
                  ? "rounded-sm bg-surface-muted py-1 text-center text-xs text-subtle"
                  : "py-1 text-center text-xs text-muted"
              }
              key={month.month}
            >
              {monthLabels[month.month - 1]}
            </span>
          ))}
        </div>

        <ul
          aria-label="Legenda dos gastos mensais"
          className="flex flex-wrap gap-3"
        >
          {series.map((serie) => (
            <li
              className="flex items-center gap-2 text-sm text-muted"
              key={serie.externalNumSubCota ?? "outras-despesas"}
            >
              <span
                aria-hidden="true"
                className="size-3 rounded-sm"
                style={{ backgroundColor: serie.color }}
              />
              {serie.description}
            </li>
          ))}
          {distribuicao.months.some(
            (month) => month.totalAmountUsedCents === null,
          ) ? (
            <li className="flex items-center gap-2 text-sm text-muted">
              <span
                aria-hidden="true"
                className="size-3 rounded-sm bg-surface-muted ring-1 ring-border-strong"
              />
              Dados ainda não carregados
            </li>
          ) : null}
        </ul>

        <figcaption
          aria-live="polite"
          className="min-h-20 rounded-md bg-surface-muted px-4 py-3 text-sm"
        >
          {activeMonth === null ||
          activeSerie === null ||
          activeAmount === null ? (
            <p className="text-muted">
              Passe o mouse, toque ou use o teclado para explorar mês e
              categoria.
            </p>
          ) : (
            <div className="grid gap-1">
              <strong className="font-[680] text-ink">
                {monthLabels[activeMonth.month - 1]} · {activeSerie.description}
              </strong>
              <p className="tabular-nums text-muted">
                {formatGastoCotaAmount(activeAmount)}
              </p>
            </div>
          )}
        </figcaption>

        <table
          aria-label="Alternativa textual dos gastos mensais"
          className="sr-only"
        >
          <caption>
            Gastos mensais de {year}. Total representado:{" "}
            {formatGastoCotaAmount(distribuicao.totalAmountUsedCents)}. Total
            informado pela Câmara:{" "}
            {`${formatGastoCotaAmount(totalAmountUsedCents)}.`}
          </caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              {series.map((serie) => (
                <th
                  key={serie.externalNumSubCota ?? "outras-despesas"}
                  scope="col"
                >
                  {serie.description}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {distribuicao.months.map((month) => (
              <tr key={month.month}>
                <th scope="row">{monthLabels[month.month - 1]}</th>
                {series.map((serie, index) => (
                  <td key={serie.externalNumSubCota ?? "outras-despesas"}>
                    {month.amountUsedCentsBySeries === null
                      ? "Não carregado"
                      : formatGastoCotaAmount(
                          month.amountUsedCentsBySeries[index] ?? 0,
                        )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </section>
  );
}

function formatCompactAmount(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value / 100);
}
