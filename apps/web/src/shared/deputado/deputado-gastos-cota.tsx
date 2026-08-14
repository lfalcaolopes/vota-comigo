"use client";

import type { DeputadoCeapResponse } from "@vota-comigo/shared-types";

import { InlineMessage, Skeleton, SkeletonRows, SourceLink } from "@/shared/ui";

import { formatData } from "./presentation";
import { GastoCotaDistribuicaoAnual } from "./gasto-cota-distribuicao-anual";
import type { DeputadoYearCacheState } from "./use-deputado-year-cache";

export type GastosCotaState = DeputadoYearCacheState<DeputadoCeapResponse>;

export function DeputadoGastosCotaSection({
  state,
}: {
  state: GastosCotaState;
}) {
  const response = state.status === "success" ? state.response : null;

  return (
    <section
      aria-labelledby="deputado-gastos-cota-title"
      className="grid min-w-0 scroll-mt-20 gap-5 md:scroll-mt-24"
      id="gastos"
    >
      <div className="pt-6">
        <h3
          className="text-lg font-[680] leading-snug text-ink text-balance"
          id="deputado-gastos-cota-title"
        >
          Gastos anuais da cota parlamentar
        </h3>
      </div>

      {state.status === "loading" ? (
        <div className="grid gap-5">
          <SkeletonRows count={2} />
          <GastoCotaDistribuicaoSkeleton />
        </div>
      ) : null}
      {state.status === "error" ? (
        <InlineMessage
          body="Tente novamente mais tarde. O restante do perfil continua disponível."
          title="Não foi possível carregar os gastos da cota agora."
          tone="danger"
        />
      ) : null}

      {response !== null && response.status === "ok" ? (
        <div className="grid min-w-0 gap-5">
          {response.sigepaDataStatus === "incompleto" ? (
            <CotaSigepaDataNote />
          ) : null}
          {!response.exercicioAnoCompleto ? (
            <p className="text-sm text-muted">
              Exercício no ano:{" "}
              {response.periodosExercicio
                .map(
                  (periodo) =>
                    `${formatData(periodo.startDate)} a ${formatData(periodo.endDate)}`,
                )
                .join("; ")}
              . Sem comparação com deputados que exerceram o ano inteiro.
            </p>
          ) : null}

          <GastoCotaDistribuicaoAnual
            categories={response.categories}
            coverageLabel={formatCoverageRange(
              response.coveredThroughMonth,
              response.year,
            )}
            key={response.year}
            medianaUf={response.medianaUf}
            sigepaDataStatus={response.sigepaDataStatus}
            siglaUf={response.siglaUf}
            totalAmountUsedCents={response.totalAmountUsedCents}
            year={response.year}
          />
        </div>
      ) : null}
      {response !== null && response.status === "sem-gastos" ? (
        <div className="grid gap-5">
          {response.sigepaDataStatus === "incompleto" ? (
            <CotaSigepaDataNote />
          ) : null}
          <InlineMessage
            body={
              response.sigepaDataStatus === "incompleto"
                ? "Não há outros registros de gastos para este deputado neste ano."
                : "Não há registros de gastos da cota para este deputado neste ano."
            }
            title={
              response.sigepaDataStatus === "incompleto"
                ? "Nenhum gasto encontrado na fonte disponível"
                : "Nenhum gasto registrado"
            }
          />
          <CotaCoverageAndSource
            coveredThroughMonth={response.coveredThroughMonth}
            year={response.year}
          />
        </div>
      ) : null}
      {response !== null && response.status === "ano-nao-carregado" ? (
        <div className="grid gap-5">
          <InlineMessage
            body={`Os gastos da cota de ${response.year} ainda não estão disponíveis no produto.`}
            title="Este ano ainda não foi carregado"
            tone="warning"
          />
          <CotaSourceLink />
        </div>
      ) : null}
    </section>
  );
}

function CotaSigepaDataNote() {
  return (
    <p className="rounded-md bg-surface-muted px-4 py-3 text-sm leading-normal text-muted">
      <strong className="font-[650] text-ink">Nota sobre os dados:</strong>{" "}
      passagens emitidas pelo SIGEPA não constam nesta fonte a partir de agosto
      de 2025. O total pode estar abaixo do informado pela Câmara.{" "}
      <a
        className="font-[650] text-info underline decoration-info/35 underline-offset-[0.18em]"
        href="https://www.camara.leg.br/transparencia/gastos-parlamentares"
        rel="noreferrer"
        target="_blank"
      >
        Ver dados na Câmara
      </a>
    </p>
  );
}

function GastoCotaDistribuicaoSkeleton() {
  return (
    <div
      aria-label="Carregando distribuição anual dos gastos"
      className="grid gap-4"
      role="status"
    >
      <div className="grid items-center gap-5 sm:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] sm:gap-8">
        <Skeleton className="aspect-square w-full max-w-80 justify-self-center rounded-full" />
        <div className="grid gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton className="h-8 w-full rounded-md" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CotaCoverageAndSource({
  coveredThroughMonth,
  year,
}: {
  coveredThroughMonth: number;
  year: number;
}) {
  return (
    <>
      <p className="text-sm text-muted">
        Dados da Câmara atualizados até{" "}
        {formatCoverage(coveredThroughMonth, year)}.
      </p>
      <CotaSourceLink />
    </>
  );
}

function CotaSourceLink() {
  return (
    <SourceLink
      href="https://dadosabertos.camara.leg.br/"
      rel="noreferrer"
      target="_blank"
    >
      Fonte: Câmara dos Deputados
    </SourceLink>
  );
}

function formatCoverage(month: number, year: number): string {
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return `${monthLabel} de ${year}`;
}

function formatCoverageRange(month: number, year: number): string {
  if (month === 12) return `ano de ${year}`;
  return `janeiro a ${formatCoverage(month, year)}`;
}
