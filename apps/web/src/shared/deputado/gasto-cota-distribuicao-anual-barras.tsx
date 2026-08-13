"use client";

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

import type { GastoCotaSerieComCor } from "./gasto-cota-paleta";
import { formatGastoCotaAmount } from "./gasto-cota-presentation";
import {
  gastoCotaSelecaoInicial,
  getGastoCotaIndiceAtivo,
  reduceGastoCotaSelecao,
} from "./gasto-cota-selecao";

export function GastoCotaDistribuicaoAnualBarras({
  series,
  year,
}: {
  series: readonly GastoCotaSerieComCor[];
  year: number;
}) {
  const [selecao, dispatchSelecao] = useReducer(
    reduceGastoCotaSelecao,
    gastoCotaSelecaoInicial,
  );
  const activeIndex = getGastoCotaIndiceAtivo(selecao);
  const activeSerie =
    activeIndex === null ? null : (series[activeIndex] ?? null);

  return (
    <figure
      aria-label={`Gráfico de barras horizontais da distribuição anual em ${year}`}
      className="grid min-w-0 gap-4"
      onMouseLeave={() => dispatchSelecao({ type: "clear-preview" })}
    >
      <div aria-hidden="true" className="h-72 min-w-0 w-full">
        <ResponsiveContainer height="100%" minWidth={0} width="100%">
          <BarChart
            accessibilityLayer={false}
            barCategoryGap="24%"
            data={series}
            layout="vertical"
            margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
            tabIndex={-1}
          >
            <CartesianGrid horizontal={false} stroke="var(--color-border)" />
            <XAxis
              axisLine={false}
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              tickFormatter={formatGastoCotaAmount}
              tickLine={false}
              type="number"
            />
            <YAxis dataKey="description" hide type="category" />
            <ReferenceLine stroke="var(--color-border-strong)" x={0} />
            <Bar
              dataKey="amountUsedCents"
              isAnimationActive={false}
              onClick={(_, index) => dispatchSelecao({ type: "pin", index })}
              onMouseEnter={(_, index) =>
                dispatchSelecao({ type: "preview", index })
              }
            >
              {series.map((serie, index) => (
                <Cell
                  className="vc-data-segment transition-opacity duration-200"
                  fill={serie.color}
                  key={serie.externalNumSubCota ?? "outras-despesas"}
                  opacity={
                    activeIndex === null || activeIndex === index ? 1 : 0.42
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ol
        aria-label="Alternativa textual da distribuição anual"
        className="grid min-w-0 gap-3"
      >
        {series.map((serie, index) => (
          <li key={serie.externalNumSubCota ?? "outras-despesas"}>
            <button
              aria-pressed={activeIndex === index}
              className="grid min-h-11 w-full min-w-0 grid-cols-[0.75rem_minmax(0,1fr)_max-content] items-start gap-x-3 rounded-md px-2 py-2 text-left text-sm transition-colors duration-200 hover:bg-surface-muted aria-pressed:bg-surface-muted motion-reduce:transition-none"
              onBlur={() => dispatchSelecao({ type: "clear-preview" })}
              onClick={() => dispatchSelecao({ type: "pin", index })}
              onFocus={() => dispatchSelecao({ type: "preview", index })}
              onMouseEnter={() => dispatchSelecao({ type: "preview", index })}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  dispatchSelecao({ type: "clear" });
                }
              }}
              type="button"
            >
              <span
                aria-hidden="true"
                className="mt-1 size-3 rounded-sm"
                style={{ backgroundColor: serie.color }}
              />
              <span className="min-w-0 leading-snug text-ink">
                {serie.description}
              </span>
              <span className="tabular-nums text-muted">
                {formatGastoCotaAmount(serie.amountUsedCents)}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <figcaption
        aria-atomic="true"
        aria-live="polite"
        className="min-h-20 rounded-md bg-surface-muted px-4 py-3 text-sm"
      >
        {activeSerie === null ? (
          <p className="text-muted">
            Passe o mouse, toque ou use o teclado para ver uma categoria.
          </p>
        ) : (
          <div className="grid gap-1">
            <strong className="font-[680] text-ink">
              {activeSerie.description}
            </strong>
            <p className="tabular-nums text-muted">
              {formatGastoCotaAmount(activeSerie.amountUsedCents)}
            </p>
          </div>
        )}
      </figcaption>
    </figure>
  );
}
