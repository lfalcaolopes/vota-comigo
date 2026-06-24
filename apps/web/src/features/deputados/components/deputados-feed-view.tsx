"use client";

import type {
  DeputadoCard,
  PartidoDisponivel,
  UfDisponivel,
} from "@vota-comigo/shared-types";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import {
  buildDeputadosFeedHref,
  DeputadoPartidoControl,
  DeputadoUfControl,
  useDeputadoFeedState,
} from "@/shared/deputado";
import { Button, SearchField, Switch } from "@/shared/ui";

import { DeputadosFeedList } from "./deputados-feed-list";

type DeputadosFeedViewProps = {
  initialItems: DeputadoCard[];
  initialTotal: number;
  initialQuery?: string | null;
  initialEmAtividade?: boolean;
  initialUf?: string | null;
  initialPartido?: string | null;
  ufs?: readonly UfDisponivel[];
  partidos?: readonly PartidoDisponivel[];
};

export function DeputadosFeedView({
  initialItems,
  initialTotal,
  initialQuery = null,
  initialEmAtividade = false,
  initialUf = null,
  initialPartido = null,
  ufs = [],
  partidos = [],
}: DeputadosFeedViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    items,
    total,
    status,
    query,
    emAtividade,
    uf,
    partido,
    display,
    canLoadMore,
    submitSearch,
    clearSearch,
    toggleEmAtividade,
    changeUf,
    clearUf,
    changePartido,
    clearPartido,
    clearFilters,
    loadMore,
  } = useDeputadoFeedState(
    initialItems,
    initialTotal,
    initialQuery ?? "",
    initialEmAtividade,
    initialUf,
    initialPartido,
  );

  const [draft, setDraft] = useState(initialQuery ?? "");
  const activeQuery = query || null;

  async function handleClear() {
    setDraft("");
    router.replace(
      buildDeputadosFeedHref(pathname, {
        query: null,
        emAtividade,
        uf,
        partido,
      }),
    );
    await clearSearch();
  }

  async function handleSearch() {
    const term = draft.trim();
    if (term.length === 0) {
      await handleClear();
      return;
    }

    router.replace(
      buildDeputadosFeedHref(pathname, {
        query: term,
        emAtividade,
        uf,
        partido,
      }),
    );
    await submitSearch(term);
  }

  async function handleEmAtividade() {
    const next = !emAtividade;
    router.replace(
      buildDeputadosFeedHref(pathname, {
        query: activeQuery,
        emAtividade: next,
        uf,
        partido,
      }),
    );
    await toggleEmAtividade();
  }

  async function handleUf(value: string) {
    const next = uf === value ? null : value;
    router.replace(
      buildDeputadosFeedHref(pathname, {
        query: activeQuery,
        emAtividade,
        uf: next,
        partido,
      }),
    );
    if (next === null) {
      await clearUf();
    } else {
      await changeUf(next);
    }
  }

  async function handleClearUf() {
    router.replace(
      buildDeputadosFeedHref(pathname, {
        query: activeQuery,
        emAtividade,
        uf: null,
        partido,
      }),
    );
    await clearUf();
  }

  async function handlePartido(value: string) {
    const next = partido === value ? null : value;
    router.replace(
      buildDeputadosFeedHref(pathname, {
        query: activeQuery,
        emAtividade,
        uf,
        partido: next,
      }),
    );
    if (next === null) {
      await clearPartido();
    } else {
      await changePartido(next);
    }
  }

  async function handleClearPartido() {
    router.replace(
      buildDeputadosFeedHref(pathname, {
        query: activeQuery,
        emAtividade,
        uf,
        partido: null,
      }),
    );
    await clearPartido();
  }

  async function handleClearFilters() {
    setDraft("");
    router.replace(
      buildDeputadosFeedHref(pathname, {
        query: null,
        emAtividade: false,
        uf: null,
        partido: null,
      }),
    );
    await clearFilters();
  }

  const filterPanelClassName = "order-last sm:order-none";
  const filterTriggerClassName =
    "w-full [&>button]:w-full [&>button]:justify-center [&>span]:w-full sm:w-auto sm:[&>button]:w-auto sm:[&>span]:w-auto";

  return (
    <div className="grid min-w-0 gap-7">
      <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-start">
        <div className="grid min-w-0 max-w-full gap-3">
          <form
            className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch();
            }}
          >
            <div className="min-w-0 flex-1">
              <SearchField
                className="h-11"
                hideLabel
                id="deputado-feed-search"
                label="Buscar por nome"
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Buscar por nome"
                value={draft}
              />
            </div>
            <Button
              className="h-11 sm:shrink-0"
              disabled={status === "loading"}
              type="submit"
              variant="primary"
            >
              Buscar
            </Button>
          </form>

          {query !== "" ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <p className="text-muted">
                Resultados para{" "}
                <span className="font-[650] text-ink">&quot;{query}&quot;</span>
              </p>
              <button
                className="font-[650] text-muted underline decoration-border underline-offset-2 transition-colors duration-[140ms] ease-standard hover:text-ink hover:decoration-current"
                onClick={handleClear}
                type="button"
              >
                Limpar busca
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid min-w-0 gap-2 sm:contents">
          <p className="text-sm font-[650] text-muted sm:hidden">Filtros</p>
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:contents">
            <Switch
              checked={emAtividade}
              className="h-11 min-w-0 justify-start rounded-md border border-border bg-white px-3 py-2.5 sm:px-4"
              disabled={status === "loading"}
              label="Em atividade"
              onChange={handleEmAtividade}
            />

            <DeputadoUfControl
              activeUf={uf}
              onClear={handleClearUf}
              onSelect={handleUf}
              panelClassName={filterPanelClassName}
              triggerClassName={filterTriggerClassName}
              ufs={ufs}
            />

            <DeputadoPartidoControl
              activePartido={partido}
              onClear={handleClearPartido}
              onSelect={handlePartido}
              panelClassName={filterPanelClassName}
              triggerClassName={filterTriggerClassName}
              partidos={partidos}
            />

            <Button
              className="h-11 min-w-0 sm:hidden"
              disabled={status === "loading"}
              onClick={handleClearFilters}
              variant="secondary"
            >
              Limpar
            </Button>
          </div>
        </div>
      </div>

      <DeputadosFeedList
        canLoadMore={canLoadMore}
        display={display}
        items={items}
        onClearFilters={handleClearFilters}
        onLoadMore={loadMore}
        status={status}
        total={total}
      />
    </div>
  );
}
