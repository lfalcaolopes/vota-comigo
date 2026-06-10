"use client";

import type { ProposicaoCard } from "@vota-comigo/shared-types";

import { ProposicaoRow } from "@/shared/proposicao";
import { Button, InlineMessage, SkeletonRows } from "@/shared/ui";

import { useFeedState } from "../hooks/use-feed-state";

type FeedListProps = {
  initialItems: ProposicaoCard[];
  initialTotal: number;
};

export function FeedList({ initialItems, initialTotal }: FeedListProps) {
  const { items, total, status, canLoadMore, loadMore } = useFeedState(
    initialItems,
    initialTotal,
  );

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid min-w-0 border-t border-border">
        {items.map((card) => (
          <ProposicaoRow card={card} key={card.externalIdProposicao} />
        ))}
        {status === "loading" ? <SkeletonRows count={3} /> : null}
      </div>

      {status === "error" ? (
        <InlineMessage
          body="Não foi possível carregar mais proposições. Tente novamente."
          title="Erro ao carregar"
          tone="danger"
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Mostrando {items.length} de {total}
        </p>

        {status === "error" ? (
          <Button onClick={loadMore} variant="secondary">
            Tentar novamente
          </Button>
        ) : canLoadMore ? (
          <Button
            disabled={status === "loading"}
            onClick={loadMore}
            variant="secondary"
          >
            {status === "loading" ? "Carregando…" : "Carregar mais"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
