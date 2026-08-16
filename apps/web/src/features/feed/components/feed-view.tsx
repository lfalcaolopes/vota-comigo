"use client";

import type {
  FeedOrdenacao,
  ProposicaoCard,
  TemaDisponivel,
} from "@vota-comigo/shared-types";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import {
  buildFeedHref,
  buildFeedSearchParams,
  FILTROS_PADRAO,
  ProposicaoFiltrosBar,
  useFeedState,
  type ProposicaoFeedFiltros,
} from "@/shared/proposicao";

import { FeedList } from "./feed-list";

type FeedViewProps = {
  initialItems: ProposicaoCard[];
  initialTotal: number;
  initialOrdenacao?: FeedOrdenacao;
  initialQuery?: string | null;
  initialTema?: number | null;
  temas?: readonly TemaDisponivel[];
};

export function FeedView({
  initialItems,
  initialTotal,
  initialOrdenacao = "mais-votadas",
  initialQuery = null,
  initialTema = null,
  temas = [],
}: FeedViewProps) {
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
  } = useFeedState({
    items: initialItems,
    total: initialTotal,
    query: initialQuery ?? "",
    filtros: { ordenacao: initialOrdenacao, tema: initialTema },
  });

  const [draft, setDraft] = useState(initialQuery ?? "");
  const activeQuery = query || null;
  const itemSearchParams = buildFeedSearchParams({
    ordenacao: filtros.ordenacao,
    query: activeQuery,
    tema: filtros.tema,
  }).toString();

  function replaceHref(next: {
    query: string | null;
    filtros: ProposicaoFeedFiltros;
  }) {
    router.replace(
      buildFeedHref(pathname, {
        ordenacao: next.filtros.ordenacao,
        query: next.query,
        tema: next.filtros.tema,
      }),
    );
  }

  async function handleClearSearch() {
    setDraft("");
    replaceHref({ query: null, filtros });
    await clearSearch();
  }

  async function handleSearch() {
    const term = draft.trim();
    if (term.length === 0) {
      await handleClearSearch();
      return;
    }

    replaceHref({ query: term, filtros });
    await submitSearch(term);
  }

  async function handleApplyFiltros(next: ProposicaoFeedFiltros) {
    replaceHref({ query: activeQuery, filtros: next });
    await applyFiltros(next);
  }

  async function handleClearTudo() {
    setDraft("");
    replaceHref({ query: null, filtros: FILTROS_PADRAO });
    await clearTudo();
  }

  const announcement =
    display === "loading"
      ? "Atualizando lista de propostas."
      : display === "error"
        ? "Não foi possível atualizar a lista de propostas."
        : total === 1
          ? "Lista atualizada: 1 proposta encontrada."
          : `Lista atualizada: ${total} propostas encontradas.`;

  return (
    <div className="grid min-w-0 gap-7">
      <p aria-atomic="true" className="sr-only" role="status">
        {announcement}
      </p>

      <ProposicaoFiltrosBar
        draft={draft}
        filtros={filtros}
        onApplyFiltros={handleApplyFiltros}
        onClearSearch={handleClearSearch}
        onDraftChange={setDraft}
        onSearch={handleSearch}
        query={query}
        temas={temas}
      />

      <FeedList
        canLoadMore={canLoadMore}
        display={display}
        items={items}
        itemSearchParams={itemSearchParams}
        onClearTudo={handleClearTudo}
        onLoadMore={loadMore}
        status={status}
        total={total}
      />
    </div>
  );
}
