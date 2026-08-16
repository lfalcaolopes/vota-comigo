"use client";

import type {
  DeputadoCard,
  PartidoDisponivel,
  UfDisponivel,
} from "@vota-comigo/shared-types";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import {
  buildComparativoDeputadosHref,
  buildDeputadosFeedHref,
  canOpenComparativo,
  descreverFiltrosAtivos,
  FILTROS_PADRAO,
  hasComparativoDeputadoLimit,
  removerFiltro,
  toggleComparativoDeputado,
  useDeputadoFeedState,
  type DeputadoFeedFiltros,
  type DeputadoFiltroId,
} from "@/shared/deputado";
import { Button, FiltrosAtivos, SearchField } from "@/shared/ui";

import { DeputadosFeedList } from "./deputados-feed-list";
import { DeputadosFiltrosPanel } from "./deputados-filtros-panel";

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
    filtros,
    display,
    canLoadMore,
    submitSearch,
    clearSearch,
    applyFiltros,
    clearTudo,
    loadMore,
  } = useDeputadoFeedState({
    items: initialItems,
    total: initialTotal,
    query: initialQuery ?? "",
    filtros: {
      emAtividade: initialEmAtividade,
      uf: initialUf,
      partido: initialPartido,
    },
  });

  const [draft, setDraft] = useState(initialQuery ?? "");
  const [isSelectingComparativo, setIsSelectingComparativo] = useState(false);
  const [selectedComparativo, setSelectedComparativo] = useState<
    readonly DeputadoCard[]
  >([]);
  const activeQuery = query || null;
  const canCompare = canOpenComparativo(selectedComparativo);
  const hasDeputadoLimit = hasComparativoDeputadoLimit(selectedComparativo);

  function startComparativoSelection() {
    setSelectedComparativo([]);
    setIsSelectingComparativo(true);
  }

  function cancelComparativoSelection() {
    setSelectedComparativo([]);
    setIsSelectingComparativo(false);
  }

  function handleToggleComparativo(externalIdDeputado: number) {
    const card = items.find(
      (item) => item.externalIdDeputado === externalIdDeputado,
    );
    if (card === undefined) return;
    setSelectedComparativo((selecionados) =>
      toggleComparativoDeputado(selecionados, card),
    );
  }

  function openComparativo() {
    router.push(
      buildComparativoDeputadosHref(
        selectedComparativo.map((card) => card.externalIdDeputado),
      ),
    );
  }

  function replaceHref(next: { query: string | null } & DeputadoFeedFiltros) {
    router.replace(buildDeputadosFeedHref(pathname, next));
  }

  async function handleClearSearch() {
    setDraft("");
    replaceHref({ query: null, ...filtros });
    await clearSearch();
  }

  async function handleSearch() {
    const term = draft.trim();
    if (term.length === 0) {
      await handleClearSearch();
      return;
    }

    replaceHref({ query: term, ...filtros });
    await submitSearch(term);
  }

  async function handleApplyFiltros(next: DeputadoFeedFiltros) {
    replaceHref({ query: activeQuery, ...next });
    await applyFiltros(next);
  }

  async function handleRemoveFiltro(id: DeputadoFiltroId) {
    await handleApplyFiltros(removerFiltro(filtros, id));
  }

  async function handleClearTudo() {
    setDraft("");
    replaceHref({ query: null, ...FILTROS_PADRAO });
    await clearTudo();
  }

  const compareAction = isSelectingComparativo ? (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
      <Button
        className="h-11 min-w-0 sm:h-auto"
        onClick={cancelComparativoSelection}
        variant="ghost"
      >
        Cancelar
      </Button>
      <Button
        className="h-11 min-w-0 sm:h-auto"
        disabled={!canCompare}
        onClick={openComparativo}
        variant="primary"
      >
        Comparar
      </Button>
    </div>
  ) : (
    <Button
      className="h-11 w-full min-w-0 !border-border-strong sm:h-auto sm:w-auto sm:shrink-0 sm:px-5"
      onClick={startComparativoSelection}
      variant="secondary"
    >
      Comparar deputados
    </Button>
  );

  const announcement =
    display === "loading"
      ? "Atualizando lista de deputados."
      : display === "error"
        ? "Não foi possível atualizar a lista de deputados."
        : total === 1
          ? "Lista atualizada: 1 deputado encontrado."
          : `Lista atualizada: ${total} deputados encontrados.`;

  return (
    <div className="grid min-w-0 gap-7">
      <p aria-atomic="true" className="sr-only" role="status">
        {announcement}
      </p>

      <div className="grid min-w-0 gap-3">
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
          <div className="order-1 sm:order-2 sm:ml-auto">{compareAction}</div>
          <div className="order-2 grid min-w-0 gap-2 sm:order-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
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
                type="submit"
                variant="primary"
              >
                Buscar
              </Button>
            </form>

            <DeputadosFiltrosPanel
              filtros={filtros}
              onApply={handleApplyFiltros}
              partidos={partidos}
              ufs={ufs}
            />
          </div>
        </div>

        {query !== "" ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <p className="text-muted">
              Resultados para{" "}
              <span className="font-[650] text-ink">&quot;{query}&quot;</span>
            </p>
            <button
              className="cursor-pointer font-[650] text-muted underline decoration-border underline-offset-2 transition-colors duration-[140ms] ease-standard hover:text-ink hover:decoration-current"
              onClick={handleClearSearch}
              type="button"
            >
              Limpar busca
            </button>
          </div>
        ) : null}

        <FiltrosAtivos
          ativos={descreverFiltrosAtivos(filtros)}
          onClear={() => handleApplyFiltros(FILTROS_PADRAO)}
          onRemove={handleRemoveFiltro}
        />
      </div>

      {isSelectingComparativo ? (
        <div className="text-sm text-muted">
          {hasDeputadoLimit ? (
            <p>Você pode comparar até 3 deputados.</p>
          ) : (
            <p>Selecione 2 ou 3 deputados para comparar.</p>
          )}
        </div>
      ) : null}

      <DeputadosFeedList
        canLoadMore={canLoadMore}
        display={display}
        items={items}
        onClearTudo={handleClearTudo}
        onLoadMore={loadMore}
        selection={
          isSelectingComparativo
            ? {
                hasLimit: hasDeputadoLimit,
                onToggle: handleToggleComparativo,
                selectedIds: selectedComparativo.map(
                  (card) => card.externalIdDeputado,
                ),
              }
            : undefined
        }
        status={status}
        total={total}
      />
    </div>
  );
}
