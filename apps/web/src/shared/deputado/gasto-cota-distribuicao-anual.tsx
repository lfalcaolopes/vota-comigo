"use client";

import type {
  DeputadoCeapCategory,
  DeputadoCeapMedianaUf,
  DeputadoCeapSigepaDataStatus,
  DeputadoCeapTetoUf,
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
import {
  deriveGastoCotaComparacaoEscala,
  formatGastoCotaComparacao,
  formatGastoCotaTeto,
} from "./gasto-cota-comparacao";
import { deriveGastoCotaDistribuicao } from "./gasto-cota-distribuicao";
import { GastoCotaDistribuicaoAnualBarras } from "./gasto-cota-distribuicao-anual-barras";
import { deriveGastoCotaDistribuicaoMode } from "./gasto-cota-distribuicao-mode";
import { applyGastoCotaPaleta } from "./gasto-cota-paleta";
import { formatGastoCotaAmount } from "./gasto-cota-presentation";

export function GastoCotaDistribuicaoAnual({
  categories,
  coverageLabel,
  coveredThroughMonth,
  medianaUf,
  sigepaDataStatus,
  siglaUf,
  tetoUf,
  totalAmountUsedCents,
  year,
}: {
  categories: readonly DeputadoCeapCategory[];
  coverageLabel: string;
  coveredThroughMonth: number;
  medianaUf: DeputadoCeapMedianaUf | null;
  sigepaDataStatus: DeputadoCeapSigepaDataStatus;
  siglaUf: string | null;
  tetoUf: DeputadoCeapTetoUf | null;
  totalAmountUsedCents: number;
  year: number;
}) {
  const series = applyGastoCotaPaleta(deriveGastoCotaDistribuicao(categories));
  const mode = deriveGastoCotaDistribuicaoMode(series, totalAmountUsedCents);
  const totalLabel =
    sigepaDataStatus === "incompleto" ? "Total registrado" : "Total utilizado";
  const hasComparacao =
    siglaUf !== null && (medianaUf !== null || tetoUf !== null);

  if (mode === "barras") {
    return (
      <div className="grid gap-4">
        <GastoCotaComparacao
          coverageLabel={coverageLabel}
          coveredThroughMonth={coveredThroughMonth}
          medianaUf={medianaUf}
          siglaUf={siglaUf}
          tetoUf={tetoUf}
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
      {hasComparacao ? (
        <GastoCotaComparacao
          coverageLabel={coverageLabel}
          coveredThroughMonth={coveredThroughMonth}
          medianaUf={medianaUf}
          siglaUf={siglaUf}
          tetoUf={tetoUf}
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
  coveredThroughMonth,
  medianaUf,
  siglaUf,
  tetoUf,
  totalLabel,
  totalAmountUsedCents,
  year,
}: {
  coverageLabel: string;
  coveredThroughMonth: number;
  medianaUf: DeputadoCeapMedianaUf | null;
  siglaUf: string | null;
  tetoUf: DeputadoCeapTetoUf | null;
  totalLabel: string;
  totalAmountUsedCents: number;
  year: number;
}) {
  const hasMediana = medianaUf !== null && siglaUf !== null;
  const hasTeto = tetoUf !== null && siglaUf !== null;
  const escala = deriveGastoCotaComparacaoEscala(
    totalAmountUsedCents,
    medianaUf?.amountUsedCents ?? null,
    tetoUf?.amountCents ?? null,
  );
  const leituras = [
    hasTeto
      ? formatGastoCotaTeto(totalAmountUsedCents, tetoUf, coveredThroughMonth)
      : null,
    hasMediana
      ? formatGastoCotaComparacao(
          totalAmountUsedCents,
          medianaUf.amountUsedCents,
        )
      : null,
  ].filter((leitura): leitura is string => leitura !== null);

  return (
    <figure
      aria-label={comparacaoLabel({
        hasMediana,
        hasTeto,
        siglaUf,
        totalLabel,
        year,
      })}
      className="grid gap-3 rounded-md bg-surface-muted px-4 py-4"
    >
      <div
        className={`grid gap-4 ${hasTeto || hasMediana ? "grid-cols-2" : ""}`}
      >
        <GastoCotaValor
          label={`${totalLabel} em ${year}`}
          value={totalAmountUsedCents}
        />
        {hasTeto ? (
          <GastoCotaValor
            align="right"
            label={
              tetoUf.monthCount === 12
                ? `Teto do ano em ${siglaUf}`
                : `Teto de ${tetoUf.monthCount} meses em ${siglaUf}`
            }
            value={tetoUf.amountCents}
          />
        ) : hasMediana ? (
          <GastoCotaValor
            align="right"
            label={`Mediana em ${siglaUf}`}
            value={medianaUf.amountUsedCents}
          />
        ) : null}
      </div>

      {leituras.length > 0 ? (
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
                <XAxis domain={escala.domain} hide type="number" />
                <YAxis dataKey="label" hide type="category" />
                <Bar
                  background={{ fill: "var(--color-border)" }}
                  dataKey="amountUsedCents"
                  fill="var(--color-muted)"
                  isAnimationActive={false}
                  radius={[0, 4, 4, 0]}
                />
                {hasTeto && escala.tetoExcedido ? (
                  <ReferenceLine
                    stroke="var(--color-bg)"
                    strokeDasharray="4 3"
                    strokeWidth={2}
                    x={tetoUf.amountCents}
                  />
                ) : null}
                {hasMediana ? (
                  <ReferenceLine
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    x={medianaUf.amountUsedCents}
                  />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-y-1 text-sm font-[680] text-ink sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
            {leituras.map((leitura, index) => (
              <span className="contents" key={leitura}>
                {index > 0 ? (
                  <span
                    aria-hidden="true"
                    className="hidden text-subtle sm:inline"
                  >
                    ·
                  </span>
                ) : null}
                <p>{leitura}</p>
              </span>
            ))}
          </div>
          {hasTeto && hasMediana ? (
            <p className="flex items-center gap-2 text-xs text-muted">
              <span
                aria-hidden="true"
                className="h-3 w-[3px] shrink-0 rounded-full bg-primary"
              />
              Mediana em {siglaUf}:{" "}
              {formatGastoCotaAmount(medianaUf.amountUsedCents)}
            </p>
          ) : null}
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
        <span className="sm:ml-auto sm:text-right">
          Dados disponíveis: {coverageLabel}.
        </span>
      </div>
      {hasTeto ? (
        <figcaption className="text-xs leading-normal text-muted">
          O teto vem da tabela por UF do Ato da Mesa em vigor e não inclui os
          adicionais mensais por cargo, como liderança, presidência de comissão
          e suplência na Mesa.
        </figcaption>
      ) : null}
    </figure>
  );
}

function comparacaoLabel({
  hasMediana,
  hasTeto,
  siglaUf,
  totalLabel,
  year,
}: {
  hasMediana: boolean;
  hasTeto: boolean;
  siglaUf: string | null;
  totalLabel: string;
  year: number;
}): string {
  if (hasTeto && hasMediana) {
    return `Comparação visual entre o total utilizado, o teto da cota e a mediana em ${siglaUf}`;
  }
  if (hasTeto) {
    return `Comparação visual entre o total utilizado e o teto da cota em ${siglaUf}`;
  }
  if (hasMediana) {
    return `Comparação visual entre o total utilizado e a mediana em ${siglaUf}`;
  }
  return `${totalLabel} em ${year}`;
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
