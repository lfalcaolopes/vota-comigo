"use client";

import type {
  DeputadoDiscursosResponse,
  DeputadoOrgao,
  DeputadoOrgaosResponse,
  DeputadoPerfilValidYearRange,
  DeputadoProposicoesAssinadasResponse,
} from "@vota-comigo/shared-types";
import { useState } from "react";

import { InlineMessage, Skeleton, SkeletonRows } from "@/shared/ui";

import { DeputadoGastosCotaSection } from "./deputado-gastos-cota";
import { DeputadoPerfilYearSelector } from "./deputado-perfil-year-selector";
import { formatData } from "./presentation";
import { ceap, discursos, orgaos, proposicoesAssinadas } from "./queries";
import {
  useDeputadoYearCache,
  type DeputadoYearCacheState,
} from "./use-deputado-year-cache";

type OrgaosState = DeputadoYearCacheState<DeputadoOrgaosResponse>;
type ProposicoesState =
  DeputadoYearCacheState<DeputadoProposicoesAssinadasResponse>;
type DiscursosState = DeputadoYearCacheState<DeputadoDiscursosResponse>;

export function DeputadoAtuacao({
  externalIdDeputado,
  initialYear,
  validYearRange,
}: {
  externalIdDeputado: number;
  initialYear: number;
  validYearRange: DeputadoPerfilValidYearRange;
}) {
  const [year, setYear] = useState(initialYear);
  const yearCache = { externalIdDeputado, initialYear, year };
  const gastosCotaState = useDeputadoYearCache({ ...yearCache, query: ceap });
  const proposicoesState = useDeputadoYearCache({
    ...yearCache,
    query: proposicoesAssinadas,
  });
  const orgaosState = useDeputadoYearCache({ ...yearCache, query: orgaos });
  const discursosState = useDeputadoYearCache({
    ...yearCache,
    query: discursos,
  });

  return (
    <section
      aria-labelledby="deputado-atuacao-title"
      className="grid scroll-mt-20 gap-8 border-t border-border pt-8 md:scroll-mt-24"
      id="atuacao"
    >
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h2
          className="text-lg font-[680] leading-snug text-ink"
          id="deputado-atuacao-title"
        >
          Atuação na Câmara
        </h2>
        <DeputadoPerfilYearSelector
          availableYears={
            gastosCotaState.status === "success"
              ? gastosCotaState.response.availableYears
              : undefined
          }
          initialYear={initialYear}
          onYearChange={setYear}
          validYearRange={validYearRange}
        />
      </div>

      <AtuacaoResumo
        discursosState={discursosState}
        proposicoesState={proposicoesState}
      />

      <DeputadoGastosCotaSection state={gastosCotaState} />

      <DeputadoOrgaosSection state={orgaosState} />
    </section>
  );
}

export function AtuacaoResumo({
  discursosState,
  proposicoesState,
}: {
  discursosState: DiscursosState;
  proposicoesState: ProposicoesState;
}) {
  const proposicoesDisponivel =
    proposicoesState.status === "success" &&
    proposicoesState.response.disponivel
      ? proposicoesState.response
      : null;
  const proposicoesLacuna =
    proposicoesState.status === "success" &&
    !proposicoesState.response.disponivel;

  const coberturaEmAberto =
    proposicoesDisponivel !== null &&
    proposicoesDisponivel.coveredThroughDate !== null &&
    proposicoesDisponivel.coveredThroughDate.startsWith(
      String(proposicoesDisponivel.year),
    )
      ? proposicoesDisponivel.coveredThroughDate
      : null;

  return (
    <div className="grid gap-3">
      <dl className="grid divide-y divide-border border-b border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <Contagem
          detail={
            proposicoesDisponivel !== null
              ? primeiroSignatarioLabel(
                  proposicoesDisponivel.totalPrimeiroSignatario,
                )
              : null
          }
          label="Proposições assinadas"
          lacuna={proposicoesLacuna}
          state={proposicoesState}
          value={
            proposicoesDisponivel !== null
              ? String(proposicoesDisponivel.total)
              : null
          }
        />
        <Contagem
          label="Discursos registrados"
          state={discursosState}
          value={
            discursosState.status === "success"
              ? String(discursosState.response.total)
              : null
          }
        />
      </dl>
      {coberturaEmAberto !== null ? (
        <p className="text-sm text-muted">
          Última atualização: {formatCobertura(coberturaEmAberto)}.
        </p>
      ) : null}
    </div>
  );
}

function primeiroSignatarioLabel(totalPrimeiroSignatario: number): string {
  return `${totalPrimeiroSignatario} como primeiro signatário`;
}

const coberturaFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatCobertura(iso: string): string {
  return coberturaFormatter.format(new Date(`${iso}T00:00:00Z`));
}

export function DeputadoOrgaosSection({ state }: { state: OrgaosState }) {
  const items = state.status === "success" ? state.response.items : [];
  const visibleItems = items.slice(0, 3);
  const remainingItems = items.slice(3);

  return (
    <section
      aria-labelledby="deputado-orgaos-title"
      className="grid scroll-mt-20 gap-4 md:scroll-mt-24"
      id="comissoes"
    >
      <div className="grid max-w-[70ch] gap-1 pt-6">
        <h3
          className="text-lg font-[680] leading-snug text-ink"
          id="deputado-orgaos-title"
        >
          Comissões e outros órgãos
        </h3>
      </div>
      {state.status === "loading" ? <SkeletonRows count={3} /> : null}
      {state.status === "error" ? (
        <InlineMessage
          body="Tente novamente mais tarde. Os demais dados do perfil continuam disponíveis."
          title="Não foi possível carregar os vínculos agora."
          tone="danger"
        />
      ) : null}
      {state.status === "success" && items.length === 0 ? (
        <p className="text-sm text-muted">
          Nenhum vínculo registrado neste ano.
        </p>
      ) : null}
      {state.status === "success" && items.length > 0 ? (
        <div className="grid gap-3">
          <OrgaosList items={visibleItems} />
          {remainingItems.length > 0 ? (
            <details className="group grid gap-3">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-3 text-sm font-[650] text-muted transition-colors duration-140 ease-standard marker:content-none hover:text-ink group-open:hidden">
                Ver mais vínculos
                <DisclosureChevron />
              </summary>
              <OrgaosList items={remainingItems} />
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function DisclosureChevron() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m5 7.5 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function OrgaosList({ items }: { items: readonly DeputadoOrgao[] }) {
  return (
    <ul className="divide-y divide-border border-t border-border">
      {items.map((item, index) => (
        <li
          className="grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.6fr)] sm:gap-6"
          key={`${item.externalIdOrgao}-${item.titulo}-${item.dataInicio}-${index}`}
        >
          <div className="min-w-0">
            <p className="text-sm font-[680] text-ink">{item.nome}</p>
            {item.siglaOrgao !== null ? (
              <p className="mt-1 text-sm text-muted">{item.siglaOrgao}</p>
            ) : null}
          </div>
          <div className="grid content-start gap-1">
            <p className="text-sm font-[650] text-ink">{item.titulo}</p>
            <p className="text-sm text-muted">{formatPeriodo(item)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatPeriodo(item: DeputadoOrgao): string {
  return item.dataFim === null
    ? `Desde ${formatData(item.dataInicio)}`
    : `${formatData(item.dataInicio)} a ${formatData(item.dataFim)}`;
}

function Contagem({
  detail,
  label,
  lacuna,
  state,
  value,
}: {
  detail?: string | null;
  label: string;
  lacuna?: boolean;
  state: ProposicoesState | OrgaosState | DiscursosState;
  value: string | null;
}) {
  return (
    <div className="grid content-start gap-2 px-1 py-4 sm:px-5 sm:first:pl-1">
      <dt className="text-sm font-[650] text-ink">{label}</dt>
      <dd>
        {state.status === "loading" ? (
          <Skeleton className="h-7 w-24 rounded-md" />
        ) : null}
        {state.status === "error" ? (
          <span className="text-sm font-[650] text-danger">Indisponível</span>
        ) : null}
        {state.status === "success" && lacuna === true ? (
          <span className="text-sm font-[650] text-muted">
            Ano não carregado
          </span>
        ) : null}
        {state.status === "success" && lacuna !== true ? (
          <>
            <span className="text-2xl leading-none font-[680] tabular-nums text-ink">
              {value}
            </span>
            {detail !== null && detail !== undefined ? (
              <p className="text-sm text-muted">{detail}</p>
            ) : null}
          </>
        ) : null}
      </dd>
    </div>
  );
}
