"use client";

import type {
  DeputadoOrgao,
  DeputadoOrgaosResponse,
  DeputadoPerfilValidYearRange,
} from "@vota-comigo/shared-types";
import { useState } from "react";

import { InlineMessage, SkeletonRows } from "@/shared/ui";

import { DeputadoPerfilYearSelector } from "./deputado-perfil-year-selector";
import { DeputadoDiscursosSection } from "./deputado-discursos";
import { DeputadoGastosCotaSection } from "./deputado-gastos-cota";
import { DeputadoProposicoesAssinadasSection } from "./deputado-proposicoes-assinadas";
import { formatData } from "./presentation";
import { ceap, discursos, orgaos, proposicoesAssinadas } from "./queries";
import {
  useDeputadoYearCache,
  type DeputadoYearCacheState,
} from "./use-deputado-year-cache";

type OrgaosState = DeputadoYearCacheState<DeputadoOrgaosResponse>;

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
      <div className="grid max-w-[70ch] gap-2">
        <h2
          className="text-lg font-[680] leading-snug text-ink"
          id="deputado-atuacao-title"
        >
          Atuação na Câmara
        </h2>
        <p className="text-sm leading-normal text-muted">
          Selecione o ano para consultar as atividades do deputado.
        </p>
      </div>
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
      <DeputadoGastosCotaSection state={gastosCotaState} />
      <DeputadoProposicoesAssinadasSection state={proposicoesState} />
      <OrgaosSection state={orgaosState} />
      <DeputadoDiscursosSection state={discursosState} />
    </section>
  );
}

function OrgaosSection({ state }: { state: OrgaosState }) {
  return (
    <section aria-labelledby="deputado-orgaos-title" className="grid gap-5">
      <div className="grid max-w-[70ch] gap-2 border-t border-border pt-6">
        <h3
          className="text-lg font-[680] leading-snug text-ink"
          id="deputado-orgaos-title"
        >
          Comissões e outros órgãos
        </h3>
        <p className="text-sm leading-normal text-muted">
          Vínculos formais registrados pela Câmara. Eles não indicam presença em
          reuniões, contribuições ou produtividade.
        </p>
      </div>
      {state.status === "loading" ? <SkeletonRows count={3} /> : null}
      {state.status === "error" ? (
        <InlineMessage
          body="Tente novamente mais tarde. O restante do perfil continua disponível."
          title="Não foi possível carregar os órgãos e cargos agora."
          tone="danger"
        />
      ) : null}
      {state.status === "success" && state.response.items.length === 0 ? (
        <InlineMessage
          body="Não há cargos ou participações em órgãos disponíveis para este ano."
          title="Nenhum vínculo encontrado"
        />
      ) : null}
      {state.status === "success" && state.response.items.length > 0 ? (
        <OrgaosList items={state.response.items} />
      ) : null}
    </section>
  );
}

function OrgaosList({ items }: { items: readonly DeputadoOrgao[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {groupOrgaos(items).map((group) => (
        <article
          className="grid min-w-0 gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)] sm:gap-6"
          key={group.externalIdOrgao}
        >
          <div className="min-w-0">
            <h4 className="text-base font-[680] leading-snug text-ink text-pretty">
              {group.nome}
            </h4>
            {group.siglaOrgao !== null ? (
              <p className="mt-1 text-sm text-muted">{group.siglaOrgao}</p>
            ) : null}
          </div>
          <ul className="grid gap-3">
            {group.vinculos.map((item, index) => (
              <li
                className="grid gap-1 sm:grid-cols-[minmax(7rem,0.45fr)_minmax(0,1fr)] sm:gap-4"
                key={`${item.titulo}-${item.dataInicio}-${item.dataFim ?? "atual"}-${index}`}
              >
                <span className="text-sm font-[650] text-ink">
                  {item.titulo}
                </span>
                <span className="text-sm text-muted">
                  {formatPeriodo(item)}
                </span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function groupOrgaos(items: readonly DeputadoOrgao[]) {
  const groups = new Map<
    number,
    {
      externalIdOrgao: number;
      siglaOrgao: string | null;
      nome: string;
      vinculos: DeputadoOrgao[];
    }
  >();

  for (const item of items) {
    const current = groups.get(item.externalIdOrgao);
    if (current === undefined) {
      groups.set(item.externalIdOrgao, {
        externalIdOrgao: item.externalIdOrgao,
        siglaOrgao: item.siglaOrgao,
        nome: item.nome,
        vinculos: [item],
      });
    } else {
      current.vinculos.push(item);
    }
  }

  return [...groups.values()];
}

function formatPeriodo(item: DeputadoOrgao): string {
  const inicio = formatData(item.dataInicio);
  return item.dataFim === null
    ? `Desde ${inicio}`
    : `${inicio} a ${formatData(item.dataFim)}`;
}
