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
      className="grid min-w-0 gap-5"
    >
      <div className="border-t border-border pt-6">
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
          <div className="grid gap-1">
            <p className="text-sm text-muted">
              Dados disponíveis:{" "}
              {formatCoverageRange(response.coveredThroughMonth, response.year)}
              .
            </p>
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
          </div>

          <GastoCotaDistribuicaoAnual
            categories={response.categories}
            key={response.year}
            medianaUf={response.medianaUf}
            siglaUf={response.siglaUf}
            totalAmountUsedCents={response.totalAmountUsedCents}
            year={response.year}
          />
        </div>
      ) : null}
      {response !== null && response.status === "sem-gastos" ? (
        <div className="grid gap-5">
          <InlineMessage
            body="Não há registros de gastos da cota para este deputado neste ano."
            title="Nenhum gasto registrado"
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
