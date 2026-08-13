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
      className="grid gap-6 border-t border-border pt-8 lg:col-span-2"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
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

      <DeputadoGastosCotaSection state={gastosCotaState} />

      <AtuacaoResumo
        discursosState={discursosState}
        proposicoesState={proposicoesState}
      />

      <DeputadoOrgaosSection state={orgaosState} />
    </section>
  );
}

function AtuacaoResumo({
  discursosState,
  proposicoesState,
}: {
  discursosState: DiscursosState;
  proposicoesState: ProposicoesState;
}) {
  return (
    <dl className="grid divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
      <Contagem
        label="Proposições assinadas"
        state={proposicoesState}
        value={
          proposicoesState.status === "success"
            ? String(proposicoesState.response.total)
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
  );
}

export function DeputadoOrgaosSection({ state }: { state: OrgaosState }) {
  const items = state.status === "success" ? state.response.items : [];
  const visibleItems = items.slice(0, 3);
  const remainingItems = items.slice(3);

  return (
    <section aria-labelledby="deputado-orgaos-title" className="grid gap-4">
      <div className="grid max-w-[70ch] gap-1 pt-6">
        <h3
          className="text-lg font-[680] leading-snug text-ink"
          id="deputado-orgaos-title"
        >
          Comissões e outros órgãos
        </h3>
        <p className="text-sm leading-normal text-muted">
          Cada vínculo corresponde ao cargo e ao período registrados pela
          Câmara.
        </p>
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
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-3 text-sm font-[650] text-muted transition-colors duration-[140ms] ease-standard marker:content-none hover:text-ink group-open:hidden">
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
  label,
  state,
  value,
}: {
  label: string;
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
        {state.status === "success" ? (
          <span className="text-2xl leading-none font-[680] tabular-nums text-ink">
            {value}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
