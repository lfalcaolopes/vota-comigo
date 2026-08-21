"use client";

import type {
  FeedOrdenacao,
  TemaDisponivel,
} from "@vota-comigo/shared-types";

import { Button } from "@/shared/ui";

import type { ProposicaoFeedFiltros } from "./feed-filtros";
import { FeedOrdenacaoControl } from "./feed-ordenacao";
import { FeedSearch } from "./feed-search";
import { ProposicaoTemaControl } from "./proposicao-tema-control";

type ProposicaoFiltrosBarProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  query: string;
  filtros: ProposicaoFeedFiltros;
  onApplyFiltros: (filtros: ProposicaoFeedFiltros) => void;
  onClearTudo: () => void;
  isLoading?: boolean;
  temas: readonly TemaDisponivel[];
};

export function ProposicaoFiltrosBar({
  draft,
  onDraftChange,
  onSearch,
  onClearSearch,
  query,
  filtros,
  onApplyFiltros,
  onClearTudo,
  isLoading = false,
  temas,
}: ProposicaoFiltrosBarProps) {
  function handleChangeOrdenacao(ordenacao: FeedOrdenacao) {
    void onApplyFiltros({ ...filtros, ordenacao });
  }

  function handleSelectTema(cod: number) {
    void onApplyFiltros({
      ...filtros,
      tema: filtros.tema === cod ? null : cod,
    });
  }

  const filterPanelClassName = "order-last sm:basis-full sm:shrink-0";
  const filterTriggerClassName =
    "w-full [&>button]:w-full [&>button]:justify-center [&>span]:w-full sm:w-auto sm:[&>button]:w-auto sm:[&>span]:w-auto";

  return (
    <div className="grid min-w-0 gap-4 sm:flex sm:flex-wrap sm:items-start sm:gap-2">
      <FeedSearch
        className="w-full sm:min-w-0 sm:flex-1"
        isSearching={query !== ""}
        onChange={onDraftChange}
        onClear={onClearSearch}
        onSubmit={onSearch}
        query={query}
        value={draft}
      />

      <div className="grid min-w-0 gap-2 sm:contents">
        <p className="text-sm font-[650] text-muted sm:hidden">Filtros</p>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:contents">
          <FeedOrdenacaoControl
            className="col-span-full w-full sm:w-auto sm:shrink-0"
            disabled={query !== ""}
            itemClassName="flex-1 sm:flex-none"
            onChange={handleChangeOrdenacao}
            value={filtros.ordenacao}
          />

          <ProposicaoTemaControl
            activeTema={filtros.tema}
            onSelect={handleSelectTema}
            panelClassName={filterPanelClassName}
            spanToolbar
            temas={temas}
            triggerClassName={filterTriggerClassName}
          />

          <Button
            className="h-11 min-w-0 sm:hidden"
            disabled={isLoading}
            onClick={onClearTudo}
            variant="secondary"
          >
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
}
