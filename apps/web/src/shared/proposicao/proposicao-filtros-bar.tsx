"use client";

import type { TemaDisponivel } from "@vota-comigo/shared-types";

import { FiltrosAtivos } from "@/shared/ui";

import {
  descreverFiltrosAtivos,
  FILTROS_PADRAO,
  removerFiltro,
  type ProposicaoFeedFiltros,
} from "./feed-filtros";
import { FeedSearch } from "./feed-search";
import { ProposicaoFiltrosPanel } from "./proposicao-filtros-panel";

type ProposicaoFiltrosBarProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  query: string;
  filtros: ProposicaoFeedFiltros;
  onApplyFiltros: (filtros: ProposicaoFeedFiltros) => void;
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
  temas,
}: ProposicaoFiltrosBarProps) {
  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <FeedSearch
          className="min-w-0"
          isSearching={query !== ""}
          onChange={onDraftChange}
          onClear={onClearSearch}
          onSubmit={onSearch}
          query={query}
          value={draft}
        />

        <ProposicaoFiltrosPanel
          filtros={filtros}
          onApply={onApplyFiltros}
          temas={temas}
        />
      </div>

      <FiltrosAtivos
        ativos={descreverFiltrosAtivos(filtros, temas)}
        onClear={() => onApplyFiltros(FILTROS_PADRAO)}
        onRemove={(id) => onApplyFiltros(removerFiltro(filtros, id))}
      />
    </div>
  );
}
