import type { ProposicaoCard } from "@vota-comigo/shared-types";

import type { FeedDisplay, FeedStatus } from "@/shared/proposicao";
import { ProposicaoRow } from "@/shared/proposicao";
import {
  Button,
  Checkbox,
  EmptyState,
  InlineMessage,
  SkeletonRows,
} from "@/shared/ui";

type SelecaoListProps = {
  items: ProposicaoCard[];
  total: number;
  status: FeedStatus;
  display: FeedDisplay;
  canLoadMore: boolean;
  selectedIds: Set<number>;
  atLimit: boolean;
  onToggle: (proposicao: ProposicaoCard) => void;
  onLoadMore: () => Promise<void>;
  onClearSearch: () => void;
};

export function SelecaoList({
  items,
  total,
  status,
  display,
  canLoadMore,
  selectedIds,
  atLimit,
  onToggle,
  onLoadMore,
  onClearSearch,
}: SelecaoListProps) {
  if (display === "loading") {
    return <SkeletonRows count={4} />;
  }

  if (display === "empty-default") {
    return (
      <EmptyState
        body="Ainda não há proposições computáveis para exibir."
        title="Nada para exibir ainda"
      />
    );
  }

  if (display === "empty-search") {
    return (
      <EmptyState
        action={
          <Button onClick={onClearSearch} variant="secondary">
            Limpar busca
          </Button>
        }
        body="Tente outro identificador legislativo ou termo da ementa."
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
        <Button
          className="justify-self-start"
          onClick={onLoadMore}
          variant="secondary"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <ul className="grid min-w-0 border-t border-border">
        {items.map((card) => {
          const isSelected = selectedIds.has(card.externalIdProposicao);
          const disabled = !isSelected && atLimit;
          return (
            <li
              className="flex items-start gap-3 border-b border-border py-1"
              key={card.externalIdProposicao}
            >
              <Checkbox
                checked={isSelected}
                className="mt-6"
                disabled={disabled}
                hideLabel
                label={`Selecionar proposição ${card.externalIdProposicao}`}
                onChange={() => onToggle(card)}
              />
              <div className="min-w-0 flex-1">
                <ProposicaoRow card={card} />
              </div>
            </li>
          );
        })}
        {status === "loading" ? <SkeletonRows count={3} /> : null}
      </ul>

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
