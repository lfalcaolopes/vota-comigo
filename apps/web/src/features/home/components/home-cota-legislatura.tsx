import type { CotaLegislaturaResponse } from "@vota-comigo/shared-types";
import Link from "next/link";
import { Suspense, type CSSProperties, type ReactNode } from "react";

import { cotaLegislatura } from "@/shared/cota";
import {
  applyGastoCotaPaleta,
  deriveGastoCotaDistribuicao,
  deriveGastoCotaRevealTimeline,
  formatGastoCotaAmount,
  formatGastoCotaParticipacao,
  toUsoCotaPeriodoLabel,
  type GastoCotaRevealStep,
  type GastoCotaSerieComCor,
} from "@/shared/deputado";
import { Skeleton } from "@/shared/ui";

import { CotaRevealScope, CotaTotalReveal } from "./home-cota-reveal";

const contagemFormatter = new Intl.NumberFormat("pt-BR");

export function HomeCotaLegislatura() {
  return (
    <Suspense fallback={<CotaLegislaturaSkeleton />}>
      <CotaLegislaturaLoaded />
    </Suspense>
  );
}

export function CotaLegislaturaSection({
  cota,
}: {
  cota: CotaLegislaturaResponse | null;
}) {
  if (cota === null) return null;

  const series = applyGastoCotaPaleta(
    deriveGastoCotaDistribuicao(cota.categories),
  );
  // O total termina de contar quando a última barra para de crescer.
  const timeline = deriveGastoCotaRevealTimeline(
    series.map((serie) => serie.amountUsedCents),
  );

  return (
    <SectionShell anoInicio={cota.periodStart.slice(0, 4)}>
      <CotaRevealScope className="grid gap-8 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:gap-12">
        <div className="grid content-start gap-3">
          <CotaTotalReveal
            durationMs={timeline.totalDurationMs}
            totalAmountUsedCents={cota.totalAmountUsedCents}
          />
          <p className="text-sm leading-normal text-muted">
            Período analisado: {toUsoCotaPeriodoLabel(cota)}
          </p>
          <p className="text-sm leading-normal text-muted">
            Deputados considerados:{" "}
            {contagemFormatter.format(cota.deputadoCount)} (titulares e
            suplentes)
          </p>
          <CotaDefinicao />
        </div>

        <div className="grid min-w-0 gap-4">
          <h3 className="text-lg leading-snug font-[680] text-ink">
            Em que a cota parlamentar foi gasta
          </h3>
          <ol className="grid min-w-0 gap-4">
            {series.map((serie, index) => (
              <RubricaItem
                key={serie.externalNumSubCota ?? "outras-despesas"}
                serie={serie}
                step={timeline.steps[index]}
                totalAmountUsedCents={cota.totalAmountUsedCents}
              />
            ))}
          </ol>
        </div>
      </CotaRevealScope>

      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm font-[650]">
        <Link
          className="text-primary underline-offset-2 hover:underline"
          href="/deputados"
        >
          Ver o gasto de cada deputado
        </Link>
      </div>
    </SectionShell>
  );
}

function RubricaItem({
  serie,
  step,
  totalAmountUsedCents,
}: {
  serie: GastoCotaSerieComCor;
  step: GastoCotaRevealStep;
  totalAmountUsedCents: number;
}) {
  const participacao = formatGastoCotaParticipacao(
    serie.amountUsedCents,
    totalAmountUsedCents,
  );

  return (
    <li className="grid min-w-0 gap-1.5">
      <div className="grid min-w-0 gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_max-content] sm:items-baseline">
        <span className="min-w-0 text-sm leading-snug text-ink">
          {serie.description}
        </span>
        <span className="text-sm tabular-nums text-muted">
          {formatGastoCotaAmount(serie.amountUsedCents)} · {participacao}
        </span>
      </div>
      <span
        aria-hidden="true"
        className="block h-1.5 w-full overflow-hidden rounded-full bg-border"
      >
        <span
          className="vc-reveal-bar block h-full rounded-full"
          style={
            {
              backgroundColor: serie.color,
              width: toLarguraBarra(
                serie.amountUsedCents,
                totalAmountUsedCents,
              ),
              "--vc-reveal-duration": `${step.durationMs}ms`,
              "--vc-reveal-delay": `${step.delayMs}ms`,
            } as CSSProperties
          }
        />
      </span>
    </li>
  );
}

function SectionShell({
  anoInicio,
  children,
}: {
  anoInicio: string | null;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="home-cota" className="border-b border-border">
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-8 px-4 py-12 md:py-16">
        <h2
          className="max-w-[30ch] text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink"
          id="home-cota"
        >
          Quanto os deputados gastaram de cota parlamentar
          {anoInicio === null ? null : ` desde ${anoInicio}`}
        </h2>

        {children}
      </div>
    </section>
  );
}

function CotaDefinicao() {
  return (
    <p className="text-base leading-normal text-muted">
      Todo deputado tem um valor mensal para bancar o mandato: passagem aérea,
      aluguel de escritório, combustível, divulgação. É a cota parlamentar, paga
      com dinheiro público e declarada despesa por despesa.
    </p>
  );
}

function toLarguraBarra(
  amountUsedCents: number,
  totalAmountUsedCents: number,
): string {
  if (totalAmountUsedCents <= 0) return "0%";
  return `${((amountUsedCents / totalAmountUsedCents) * 100).toFixed(2)}%`;
}

async function CotaLegislaturaLoaded() {
  return <CotaLegislaturaSection cota={await loadCota()} />;
}

async function loadCota(): Promise<CotaLegislaturaResponse | null> {
  try {
    return await cotaLegislatura();
  } catch {
    return null;
  }
}

function CotaLegislaturaSkeleton() {
  return (
    <SectionShell anoInicio={null}>
      <div
        aria-label="Carregando os gastos da cota parlamentar"
        className="grid gap-8 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:gap-12"
        role="status"
      >
        <div className="grid content-start gap-3">
          <Skeleton className="h-9 w-[15rem] max-w-full rounded-md" />
          <Skeleton className="h-3 w-[12rem] max-w-full rounded-full" />
          <CotaDefinicao />
        </div>
        <div className="grid min-w-0 gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="grid gap-1.5" key={index}>
              <Skeleton className="h-3 w-[60%] rounded-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
