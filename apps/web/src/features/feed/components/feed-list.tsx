import type { ProposicaoCard } from "@vota-comigo/shared-types";

import { ProposicaoRow } from "@/shared/proposicao";
import {
  Button,
  EmptyState,
  InlineMessage,
  SkeletonRows,
} from "@/shared/ui";

import type { FeedDisplay, FeedStatus } from "@/shared/proposicao";

type FeedListProps = {
  items: ProposicaoCard[];
  total: number;
  status: FeedStatus;
  display: FeedDisplay;
  canLoadMore: boolean;
  onLoadMore: () => void;
  onClearFilters: () => void;
  itemSearchParams?: string;
};

export function FeedList({
  items,
  total,
  status,
  display,
  canLoadMore,
  onLoadMore,
  onClearFilters,
  itemSearchParams = "",
}: FeedListProps) {
  const itemSearchSuffix = itemSearchParams ? `?${itemSearchParams}` : "";

  if (display === "loading") {
    return <SkeletonRows count={3} />;
  }

  if (display === "empty-default") {
    return (
      <EmptyState
        body="Ainda não há proposições computáveis para exibir."
        title="Nada para exibir ainda"
      />
    );
  }

  if (display === "empty-filtered") {
    return (
      <EmptyState
        action={
          <Button onClick={onClearFilters} variant="secondary">
            Limpar filtros
          </Button>
        }
        body="Nenhuma proposição foi encontrada com a busca e os filtros utilizados."
        title="Nenhuma proposição encontrada"
      />
    );
  }

  if (display === "error") {
    return (
      <div className="grid gap-4">
        <InlineMessage
          body="Não foi possível carregar as proposições. Tente novamente."
          title="Erro ao carregar"
          tone="danger"
        />
        <Button className="justify-self-start" onClick={onLoadMore} variant="secondary">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid min-w-0 border-t border-border">
        {items.map((card) => (
          <ProposicaoRow
            card={card}
            href={`/proposicoes/${card.externalIdProposicao}${itemSearchSuffix}`}
            key={card.externalIdProposicao}
          />
        ))}
        {status === "loading" ? <SkeletonRows count={3} /> : null}
      </div>

      {status === "error" ? (
        <InlineMessage
          body="Não foi possível carregar as proposições. Tente novamente."
          title="Erro ao carregar"
          tone="danger"
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Mostrando {items.length} de {total}
        </p>

        {status === "error" ? (
          <Button onClick={onLoadMore} variant="secondary">
            Tentar novamente
          </Button>
        ) : canLoadMore ? (
          <Button
            disabled={status === "loading"}
            onClick={onLoadMore}
            variant="secondary"
          >
            {status === "loading" ? "Carregando…" : "Carregar mais"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
