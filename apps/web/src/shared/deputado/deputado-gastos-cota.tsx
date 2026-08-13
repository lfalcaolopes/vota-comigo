"use client";

import type { DeputadoCeapResponse } from "@vota-comigo/shared-types";

import { InlineMessage, Skeleton, SkeletonRows, SourceLink } from "@/shared/ui";

import { formatData } from "./presentation";
import { GastoCotaDistribuicaoAnual } from "./gasto-cota-distribuicao-anual";
import { GastoCotaDistribuicaoMensal } from "./gasto-cota-distribuicao-mensal-chart";
import { formatGastoCotaAmount } from "./gasto-cota-presentation";
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
      <div className="grid max-w-[70ch] gap-2 border-t border-border pt-6">
        <h3
          className="text-lg font-[680] leading-snug text-ink"
          id="deputado-gastos-cota-title"
        >
          Gastos da cota parlamentar
        </h3>
        <p className="text-sm leading-normal text-muted">
          Valores utilizados da Cota para o Exercício da Atividade Parlamentar.
          O teto da cota varia por estado.
        </p>
      </div>

      {state.status === "loading" ? (
        <div className="grid gap-5">
          <SkeletonRows count={2} />
          <GastoCotaDistribuicaoSkeleton />
          <GastoCotaDistribuicaoMensalSkeleton />
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
          <div className="grid gap-2">
            <p className="text-sm text-muted">
              Total utilizado em {response.year}
            </p>
            <p className="text-3xl leading-none font-[680] tabular-nums text-ink md:text-4xl">
              {formatGastoCotaAmount(response.totalAmountUsedCents)}
            </p>
            {response.medianaUf !== null && response.siglaUf !== null ? (
              <p className="text-sm text-muted">
                Mediana de {response.siglaUf}:{" "}
                {formatGastoCotaAmount(response.medianaUf.amountUsedCents)} ({" "}
                {response.medianaUf.deputadoCount}{" "}
                {response.medianaUf.deputadoCount === 1
                  ? "deputado"
                  : "deputados"}
                )
              </p>
            ) : null}
            {!response.exercicioAnoCompleto ? (
              <div className="grid gap-1 text-sm text-muted">
                <p>
                  Exercício no ano:{" "}
                  {response.periodosExercicio
                    .map(
                      (periodo) =>
                        `${formatData(periodo.startDate)} a ${formatData(periodo.endDate)}`,
                    )
                    .join("; ")}
                </p>
                <p>
                  O deputado não é comparado com quem exerceu o ano inteiro.
                </p>
              </div>
            ) : null}
          </div>

          <GastoCotaDistribuicaoAnual
            categories={response.categories}
            key={response.year}
            totalAmountUsedCents={response.totalAmountUsedCents}
            year={response.year}
          />

          <GastoCotaDistribuicaoMensal
            categories={response.categories}
            key={`mensal-${response.year}`}
            months={response.months}
            totalAmountUsedCents={response.totalAmountUsedCents}
            year={response.year}
          />

          <CotaCoverageAndSource
            coveredThroughMonth={response.coveredThroughMonth}
            year={response.year}
          />
        </div>
      ) : null}
      {response !== null && response.status === "sem-gastos" ? (
        <div className="grid gap-5">
          <InlineMessage
            body="O deputado não registrou gastos da cota neste ano."
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
      className="grid gap-4 border-t border-border pt-5"
      role="status"
    >
      <div className="grid gap-2">
        <Skeleton className="h-5 w-56 rounded-md" />
        <Skeleton className="h-4 w-full max-w-md rounded-full" />
      </div>
      <div className="grid items-center gap-5 sm:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] sm:gap-8">
        <Skeleton className="aspect-square w-full max-w-80 justify-self-center rounded-full" />
        <div className="grid gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton className="h-8 w-full rounded-md" key={index} />
          ))}
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-md" />
    </div>
  );
}

function GastoCotaDistribuicaoMensalSkeleton() {
  return (
    <div
      aria-label="Carregando distribuição mensal dos gastos"
      className="grid gap-4 border-t border-border pt-5"
      role="status"
    >
      <div className="grid gap-2">
        <Skeleton className="h-5 w-36 rounded-md" />
        <Skeleton className="h-4 w-full max-w-lg rounded-full" />
      </div>
      <Skeleton className="h-72 w-full rounded-md" />
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton className="h-5 w-28 rounded-md" key={index} />
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-md" />
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
