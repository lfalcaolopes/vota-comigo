"use client";

import type {
  DeputadoCeapCategory,
  DeputadoCeapMedianaUf,
  DeputadoCeapSigepaDataStatus,
} from "@vota-comigo/shared-types";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { GastoCotaComposicao } from "./gasto-cota-composicao";
import { deriveGastoCotaDistribuicao } from "./gasto-cota-distribuicao";
import { GastoCotaDistribuicaoAnualBarras } from "./gasto-cota-distribuicao-anual-barras";
import { deriveGastoCotaDistribuicaoMode } from "./gasto-cota-distribuicao-mode";
import { applyGastoCotaPaleta } from "./gasto-cota-paleta";
import { formatGastoCotaAmount } from "./gasto-cota-presentation";

export function GastoCotaDistribuicaoAnual({
  categories,
  coverageLabel,
  medianaUf,
  sigepaDataStatus,
  siglaUf,
  totalAmountUsedCents,
  year,
}: {
  categories: readonly DeputadoCeapCategory[];
  coverageLabel: string;
  medianaUf: DeputadoCeapMedianaUf | null;
  sigepaDataStatus: DeputadoCeapSigepaDataStatus;
  siglaUf: string | null;
  totalAmountUsedCents: number;
  year: number;
}) {
  const series = applyGastoCotaPaleta(deriveGastoCotaDistribuicao(categories));
  const mode = deriveGastoCotaDistribuicaoMode(series, totalAmountUsedCents);
  const totalLabel =
    sigepaDataStatus === "incompleto" ? "Total registrado" : "Total utilizado";
  const hasMediana = medianaUf !== null && siglaUf !== null;

  if (mode === "barras") {
    return (
      <div className="grid gap-4">
        <GastoCotaComparacao
          coverageLabel={coverageLabel}
          medianaUf={medianaUf}
          siglaUf={siglaUf}
          totalLabel={totalLabel}
          totalAmountUsedCents={totalAmountUsedCents}
          year={year}
        />
        <GastoCotaDistribuicaoAnualBarras
          series={series}
          totalLabel={totalLabel}
          totalAmountUsedCents={totalAmountUsedCents}
          year={year}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <figure
        aria-label={`Distribuição anual dos gastos por categoria em ${year}`}
        className="grid min-w-0 items-center gap-5 sm:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] sm:gap-8 sm:items-start"
      >
        <p className="sr-only">
          {totalLabel} em {year}: {formatGastoCotaAmount(totalAmountUsedCents)}.
        </p>
        <div className="grid justify-items-center">
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
                  outerRadius="88%"
                  paddingAngle={series.length === 1 ? 0 : 1}
                  rootTabIndex={-1}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {series.map((serie) => (
                    <Cell
                      fill={serie.color}
                      key={serie.externalNumSubCota ?? "outras-despesas"}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-1/4 grid place-content-center text-center"
            >
              <span className="text-xs text-muted">{totalLabel}</span>
              <strong className="mt-1 text-lg leading-tight font-[680] tabular-nums text-ink">
                {formatGastoCotaAmount(totalAmountUsedCents)}
              </strong>
              <span className="mt-1 text-xs text-muted">{year}</span>
            </div>
          </div>
        </div>

        <ol
          aria-label="Alternativa textual da distribuição anual"
          className="grid min-w-0 gap-3"
        >
          {series.map((serie) => (
            <li key={serie.externalNumSubCota ?? "outras-despesas"}>
              <div className="grid min-h-11 w-full min-w-0 grid-cols-[0.75rem_minmax(0,1fr)_max-content] items-start gap-x-3 px-2 py-2 text-left text-sm">
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
              </div>
              <GastoCotaComposicao
                categories={serie.groupedCategories ?? []}
                totalAmountUsedCents={totalAmountUsedCents}
              />
            </li>
          ))}
        </ol>
      </figure>
      {hasMediana ? (
        <GastoCotaComparacao
          coverageLabel={coverageLabel}
          medianaUf={medianaUf}
          siglaUf={siglaUf}
          totalLabel={totalLabel}
          totalAmountUsedCents={totalAmountUsedCents}
          year={year}
        />
      ) : null}
    </div>
  );
}

function GastoCotaComparacao({
  coverageLabel,
  medianaUf,
  siglaUf,
  totalLabel,
  totalAmountUsedCents,
  year,
}: {
  coverageLabel: string;
  medianaUf: DeputadoCeapMedianaUf | null;
  siglaUf: string | null;
  totalLabel: string;
  totalAmountUsedCents: number;
  year: number;
}) {
  const hasMediana = medianaUf !== null && siglaUf !== null;
  const chartDomain = getGastoCotaComparacaoDomain(
    totalAmountUsedCents,
    medianaUf?.amountUsedCents ?? null,
  );

  return (
    <figure
      aria-label={
        hasMediana
          ? `Comparação visual entre o total utilizado e a mediana em ${siglaUf}`
          : `${totalLabel} em ${year}`
      }
      className="grid gap-3 rounded-md bg-surface-muted px-4 py-4"
    >
      <div className={`grid gap-4 ${hasMediana ? "grid-cols-2" : ""}`}>
        <GastoCotaValor
          label={`${totalLabel} em ${year}`}
          value={totalAmountUsedCents}
        />
        {hasMediana ? (
          <GastoCotaValor
            align="right"
            label={`Mediana em ${siglaUf}`}
            value={medianaUf.amountUsedCents}
          />
        ) : null}
      </div>

      {hasMediana ? (
        <>
          <div aria-hidden="true" className="h-12 min-w-0 w-full">
            <ResponsiveContainer height="100%" minWidth={0} width="100%">
              <BarChart
                barCategoryGap={0}
                data={[
                  { amountUsedCents: totalAmountUsedCents, label: "total" },
                ]}
                layout="vertical"
                margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
              >
                <XAxis domain={chartDomain} hide type="number" />
                <YAxis dataKey="label" hide type="category" />
                <Bar
                  background={{ fill: "var(--color-border)" }}
                  dataKey="amountUsedCents"
                  fill="var(--color-muted)"
                  isAnimationActive={false}
                  radius={[0, 4, 4, 0]}
                />
                <ReferenceLine
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  x={medianaUf.amountUsedCents}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <strong className="text-sm font-[680] text-ink">
            {formatGastoCotaComparacao(
              totalAmountUsedCents,
              medianaUf.amountUsedCents,
            )}
          </strong>
        </>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 text-xs text-muted">
        {hasMediana ? (
          <span>
            Comparação com {medianaUf.deputadoCount}{" "}
            {medianaUf.deputadoCount === 1 ? "deputado" : "deputados"} de{" "}
            {siglaUf} em exercício durante todo o ano
          </span>
        ) : (
          <span />
        )}
        <span className="ml-auto text-right">
          Dados disponíveis: {coverageLabel}.
        </span>
      </div>
    </figure>
  );
}

function GastoCotaValor({
  align = "left",
  label,
  value,
}: {
  align?: "left" | "right";
  label: string;
  value: number;
}) {
  return (
    <div className={`grid gap-1 ${align === "right" ? "text-right" : ""}`}>
      <span className="text-xs text-muted">{label}</span>
      <strong className="text-base font-[680] tabular-nums text-ink">
        {formatGastoCotaAmount(value)}
      </strong>
    </div>
  );
}

function getGastoCotaComparacaoDomain(
  totalAmountUsedCents: number,
  medianaAmountUsedCents: number | null,
): [number, number] {
  const mediana = medianaAmountUsedCents ?? 0;
  const minValue = Math.min(0, totalAmountUsedCents, mediana);
  const maxValue = Math.max(0, totalAmountUsedCents, mediana);
  const padding = Math.max((maxValue - minValue) * 0.08, 1);

  return [minValue < 0 ? minValue - padding : 0, maxValue + padding];
}

function formatGastoCotaComparacao(
  totalAmountUsedCents: number,
  medianaAmountUsedCents: number,
): string {
  const difference = totalAmountUsedCents - medianaAmountUsedCents;

  if (difference === 0) return "Mesmo valor da mediana";
  if (medianaAmountUsedCents <= 0 || totalAmountUsedCents < 0) {
    return `${formatGastoCotaAmount(Math.abs(difference))} ${difference < 0 ? "abaixo" : "acima"} da mediana`;
  }

  const percentage = Math.round(
    (Math.abs(difference) / medianaAmountUsedCents) * 100,
  );

  return `${percentage}% ${difference < 0 ? "abaixo" : "acima"} da mediana`;
}
