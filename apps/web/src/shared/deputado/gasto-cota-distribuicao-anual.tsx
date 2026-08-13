"use client";

import type {
  DeputadoCeapCategory,
  DeputadoCeapMedianaUf,
} from "@vota-comigo/shared-types";
import { useReducer } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { GastoCotaComposicao } from "./gasto-cota-composicao";
import { deriveGastoCotaDistribuicao } from "./gasto-cota-distribuicao";
import { GastoCotaDistribuicaoAnualBarras } from "./gasto-cota-distribuicao-anual-barras";
import { deriveGastoCotaDistribuicaoMode } from "./gasto-cota-distribuicao-mode";
import { applyGastoCotaPaleta } from "./gasto-cota-paleta";
import { formatGastoCotaAmount } from "./gasto-cota-presentation";
import {
  gastoCotaSelecaoInicial,
  getGastoCotaIndiceAtivo,
  reduceGastoCotaSelecao,
} from "./gasto-cota-selecao";

export function GastoCotaDistribuicaoAnual({
  categories,
  medianaUf,
  siglaUf,
  totalAmountUsedCents,
  year,
}: {
  categories: readonly DeputadoCeapCategory[];
  medianaUf: DeputadoCeapMedianaUf | null;
  siglaUf: string | null;
  totalAmountUsedCents: number;
  year: number;
}) {
  const series = applyGastoCotaPaleta(deriveGastoCotaDistribuicao(categories));
  const [selecao, dispatchSelecao] = useReducer(
    reduceGastoCotaSelecao,
    gastoCotaSelecaoInicial,
  );
  const activeIndex = getGastoCotaIndiceAtivo(selecao);
  const activeSerie =
    activeIndex === null ? null : (series[activeIndex] ?? null);
  const mode = deriveGastoCotaDistribuicaoMode(series, totalAmountUsedCents);

  if (mode === "barras") {
    return (
      <section
        aria-labelledby="gasto-cota-distribuicao-title"
        className="grid gap-4 border-t border-border pt-5"
      >
        <div className="grid gap-1">
          <h4
            className="text-base font-[680] leading-snug text-ink"
            id="gasto-cota-distribuicao-title"
          >
            Distribuição anual por categoria
          </h4>
          <p className="max-w-[65ch] text-sm leading-normal text-muted">
            Este ano inclui ajustes que reduzem ou anulam valores de algumas
            categorias. As barras preservam esses valores na escala.
          </p>
        </div>
        <GastoCotaComparacao
          medianaUf={medianaUf}
          siglaUf={siglaUf}
          totalAmountUsedCents={totalAmountUsedCents}
          year={year}
        />
        <GastoCotaDistribuicaoAnualBarras
          series={series}
          totalAmountUsedCents={totalAmountUsedCents}
          year={year}
        />
      </section>
    );
  }

  return (
    <section
      aria-labelledby="gasto-cota-distribuicao-title"
      className="grid gap-4 border-t border-border pt-5"
    >
      <div className="grid gap-1">
        <h4
          className="text-base font-[680] leading-snug text-ink"
          id="gasto-cota-distribuicao-title"
        >
          Distribuição anual por categoria
        </h4>
        <p className="max-w-[65ch] text-sm leading-normal text-muted">
          Cinco maiores categorias; as demais estão em Outras despesas.
        </p>
      </div>

      <figure
        aria-label={`Distribuição anual dos gastos por categoria em ${year}`}
        className="grid min-w-0 items-center gap-5 sm:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] sm:gap-8"
        onMouseLeave={() => dispatchSelecao({ type: "clear-preview" })}
      >
        <p className="sr-only">
          Total utilizado em {year}:{" "}
          {formatGastoCotaAmount(totalAmountUsedCents)}.
        </p>
        <div className="grid justify-items-center gap-2">
          <div
            aria-hidden="true"
            className="relative aspect-square w-full max-w-72 sm:max-w-80"
          >
            <ResponsiveContainer height="100%" minWidth={0} width="100%">
              <PieChart accessibilityLayer={false} tabIndex={-1}>
                <Pie
                  data={series}
                  dataKey="amountUsedCents"
                  innerRadius="58%"
                  isAnimationActive={false}
                  nameKey="description"
                  onClick={(_, index) =>
                    dispatchSelecao({ type: "pin", index })
                  }
                  onMouseEnter={(_, index) =>
                    dispatchSelecao({ type: "preview", index })
                  }
                  outerRadius="88%"
                  paddingAngle={series.length === 1 ? 0 : 1}
                  rootTabIndex={-1}
                  stroke="#ffffff"
                  strokeWidth={2}
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
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-1/4 grid place-content-center text-center"
            >
              <span className="text-xs text-muted">Total utilizado</span>
              <strong className="mt-1 text-lg leading-tight font-[680] tabular-nums text-ink">
                {formatGastoCotaAmount(totalAmountUsedCents)}
              </strong>
              <span className="mt-1 text-xs text-muted">{year}</span>
            </div>
          </div>
          <GastoCotaMediana medianaUf={medianaUf} siglaUf={siglaUf} />
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
              <GastoCotaComposicao
                categories={serie.groupedCategories ?? []}
                totalAmountUsedCents={totalAmountUsedCents}
              />
            </li>
          ))}
        </ol>

        <figcaption
          aria-atomic="true"
          aria-live="polite"
          className="min-h-20 rounded-md bg-surface-muted px-4 py-3 text-sm sm:col-span-2"
        >
          {activeSerie === null ? (
            <p className="text-muted">
              Selecione uma categoria para ver detalhes.
            </p>
          ) : (
            <div className="grid gap-1">
              <strong className="font-[680] text-ink">
                {activeSerie.description}
              </strong>
              <p className="tabular-nums text-muted">
                {formatGastoCotaAmount(activeSerie.amountUsedCents)} ·{" "}
                {formatPercentualParte(
                  activeSerie.amountUsedCents,
                  totalAmountUsedCents,
                )}{" "}
                do total
              </p>
            </div>
          )}
        </figcaption>
      </figure>
    </section>
  );
}

function GastoCotaComparacao({
  medianaUf,
  siglaUf,
  totalAmountUsedCents,
  year,
}: {
  medianaUf: DeputadoCeapMedianaUf | null;
  siglaUf: string | null;
  totalAmountUsedCents: number;
  year: number;
}) {
  const hasMediana = medianaUf !== null && siglaUf !== null;

  return (
    <div
      className={`grid max-w-xl rounded-md bg-surface-muted px-4 py-3 ${hasMediana ? "grid-cols-2 divide-x divide-border" : ""}`}
    >
      <div className="grid gap-1 pr-4">
        <span className="text-xs text-muted">Total utilizado em {year}</span>
        <strong className="text-base font-[680] tabular-nums text-ink">
          {formatGastoCotaAmount(totalAmountUsedCents)}
        </strong>
      </div>
      {hasMediana ? (
        <div className="pl-4">
          <GastoCotaMediana medianaUf={medianaUf} siglaUf={siglaUf} />
        </div>
      ) : null}
    </div>
  );
}

function GastoCotaMediana({
  medianaUf,
  siglaUf,
}: {
  medianaUf: DeputadoCeapMedianaUf | null;
  siglaUf: string | null;
}) {
  if (medianaUf === null || siglaUf === null) return null;

  return (
    <div className="grid justify-items-center gap-1 text-center">
      <span className="text-xs text-muted">Mediana em {siglaUf}</span>
      <strong className="text-base font-[680] tabular-nums text-ink">
        {formatGastoCotaAmount(medianaUf.amountUsedCents)}
      </strong>
      <span className="text-xs text-muted">
        {medianaUf.deputadoCount}{" "}
        {medianaUf.deputadoCount === 1 ? "deputado" : "deputados"} com ano
        completo
      </span>
    </div>
  );
}

function formatPercentualParte(
  partAmountCents: number,
  totalAmountCents: number,
) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(partAmountCents / totalAmountCents);
}
