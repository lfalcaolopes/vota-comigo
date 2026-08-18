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

const monthNames = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
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
          As cores seguem a distribuição anual acima.
        </p>
        {distribuicao.months.some(
          (month) => month.totalAmountUsedCents === null,
        ) ? (
          <p className="max-w-[65ch] text-sm leading-normal text-ink">
            {formatCoverageGap(distribuicao.months)} aparecem como lacunas
            porque ainda não foram carregados.
          </p>
        ) : null}
      </div>

      <figure
        aria-label={`Gráfico de barras empilhadas dos gastos mensais em ${year}`}
        className="grid min-w-0 gap-4"
        onMouseLeave={() => dispatchSelecao({ type: "clear-preview" })}
      >
        <div aria-hidden="true" className="h-72 min-w-0 w-full">
          <ResponsiveContainer height="100%" minWidth={0} width="100%">
            <BarChart
              accessibilityLayer={false}
              barCategoryGap="24%"
              data={chartData}
              margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
              stackOffset="sign"
              tabIndex={-1}
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
                  onClick={(_, monthIndex) =>
                    dispatchSelecao({
                      type: "pin",
                      point: { monthIndex, seriesIndex: index },
                    })
                  }
                  onMouseEnter={(_, monthIndex) =>
                    dispatchSelecao({
                      type: "preview",
                      point: { monthIndex, seriesIndex: index },
                    })
                  }
                  stackId="gastos"
                >
                  {distribuicao.months.map((month, monthIndex) => (
                    <Cell
                      className="vc-data-segment transition-opacity duration-200"
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
                  ? "rounded-sm border border-dashed border-border-strong bg-surface-muted py-1 text-center text-xs text-muted"
                  : "py-1 text-center text-xs text-muted"
              }
              key={month.month}
            >
              {monthLabels[month.month - 1]}
            </span>
          ))}
        </div>

        {distribuicao.months.some(
          (month) => month.totalAmountUsedCents === null,
        ) ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <span
              aria-hidden="true"
              className="size-3 rounded-sm border border-dashed border-border-strong bg-surface-muted"
            />
            Dados ainda não carregados
          </p>
        ) : null}

        <div
          className="grid gap-3 rounded-md bg-surface-muted px-4 py-3"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              dispatchSelecao({ type: "clear" });
            }
          }}
        >
          <p className="text-sm font-[680] text-ink">Explorar valores</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-[650] text-ink">
              Mês
              <select
                className="min-h-11 rounded-md border border-border-strong bg-white px-3 py-2 font-normal text-ink"
                onChange={(event) =>
                  dispatchSelecao({
                    type: "pin",
                    point: {
                      monthIndex: Number(event.target.value),
                      seriesIndex: activePoint?.seriesIndex ?? 0,
                    },
                  })
                }
                value={activePoint?.monthIndex ?? ""}
              >
                <option disabled value="">
                  Selecione um mês
                </option>
                {distribuicao.months.map((month, monthIndex) => (
                  <option key={month.month} value={monthIndex}>
                    {monthLabels[month.month - 1]}
                    {month.totalAmountUsedCents === null
                      ? " (não carregado)"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-[650] text-ink">
              Categoria
              <select
                className="min-h-11 rounded-md border border-border-strong bg-white px-3 py-2 font-normal text-ink"
                onChange={(event) =>
                  dispatchSelecao({
                    type: "pin",
                    point: {
                      monthIndex: activePoint?.monthIndex ?? 0,
                      seriesIndex: Number(event.target.value),
                    },
                  })
                }
                value={activePoint?.seriesIndex ?? ""}
              >
                <option disabled value="">
                  Selecione uma categoria
                </option>
                {series.map((serie, seriesIndex) => (
                  <option
                    key={serie.externalNumSubCota ?? "outras-despesas"}
                    value={seriesIndex}
                  >
                    {serie.description}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <figcaption aria-atomic="true" aria-live="polite" className="text-sm">
            {activeMonth === null || activeSerie === null ? (
              <p className="min-h-6 text-muted">
                Toque em uma barra ou selecione mês e categoria.
              </p>
            ) : activeAmount === null ? (
              <p className="min-h-6 text-muted">
                {monthLabels[activeMonth.month - 1]} ainda não foi carregado.
              </p>
            ) : (
              <div className="grid gap-1">
                <strong className="font-[680] text-ink">
                  {monthLabels[activeMonth.month - 1]} ·{" "}
                  {activeSerie.description}
                </strong>
                <p className="tabular-nums text-muted">
                  {formatGastoCotaAmount(activeAmount)}
                </p>
              </div>
            )}
          </figcaption>
          {activePoint !== null ? (
            <button
              className="min-h-11 justify-self-start rounded-md px-2 py-2 text-sm font-[650] text-info underline decoration-info/35 underline-offset-[0.18em]"
              onClick={() => dispatchSelecao({ type: "clear" })}
              type="button"
            >
              Limpar seleção
            </button>
          ) : null}
        </div>

        <details className="border-t border-border pt-2 text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center font-[650] text-info underline decoration-info/35 underline-offset-[0.18em]">
            Ver tabela de gastos por mês
          </summary>
          <div className="max-w-full overflow-x-auto pb-2">
            <table
              aria-label="Alternativa textual dos gastos mensais"
              className="min-w-max border-collapse text-left"
            >
              <caption className="max-w-[65ch] py-3 text-left text-muted">
                Gastos mensais de {year}. Total representado:{" "}
                {formatGastoCotaAmount(distribuicao.totalAmountUsedCents)}.
                Total informado pela Câmara:{" "}
                {`${formatGastoCotaAmount(totalAmountUsedCents)}.`}
              </caption>
              <thead>
                <tr>
                  <th
                    className="sticky left-0 min-w-16 border-b border-border bg-white px-3 py-2 font-[680] text-ink"
                    scope="col"
                  >
                    Mês
                  </th>
                  {series.map((serie) => (
                    <th
                      className="min-w-48 max-w-56 border-b border-border px-3 py-2 align-bottom font-[680] text-ink"
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
                    <th
                      className="sticky left-0 border-b border-border bg-white px-3 py-2 font-[680] text-ink"
                      scope="row"
                    >
                      {monthLabels[month.month - 1]}
                    </th>
                    {series.map((serie, index) => (
                      <td
                        className="border-b border-border px-3 py-2 tabular-nums text-muted"
                        key={serie.externalNumSubCota ?? "outras-despesas"}
                      >
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
          </div>
        </details>
      </figure>
    </section>
  );
}

function formatCoverageGap(months: readonly DeputadoCeapMonth[]): string {
  const uncoveredMonths = months.filter(
    (month) => month.totalAmountUsedCents === null,
  );
  const first = uncoveredMonths[0];
  const last = uncoveredMonths.at(-1);
  if (first === undefined || last === undefined) return "";
  const firstLabel = capitalizeFirst(monthNames[first.month - 1] ?? "");
  if (first.month === last.month) return firstLabel;
  return `${firstLabel} a ${monthNames[last.month - 1] ?? ""}`;
}

function capitalizeFirst(value: string): string {
  return `${value.charAt(0).toLocaleUpperCase("pt-BR")}${value.slice(1)}`;
}

function formatCompactAmount(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value / 100);
}
