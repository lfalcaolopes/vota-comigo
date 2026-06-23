import type { ProposicaoCard } from "@vota-comigo/shared-types";

import type { FeedDisplay, FeedStatus } from "@/shared/proposicao";
import { ProposicaoRow } from "@/shared/proposicao";
import {
  Button,
  CheckboxControl,
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
  onClearFilters: () => Promise<void>;
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
  onClearFilters,
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

  if (display === "empty-filtered") {
    return (
      <EmptyState
        action={
          <Button onClick={() => void onClearFilters()} variant="secondary">
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
            <li key={card.externalIdProposicao}>
              <label
                className={`flex items-start gap-3 py-1 ${
                  disabled ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <CheckboxControl
                  aria-label={`Selecionar proposição ${card.externalIdProposicao}`}
                  checked={isSelected}
                  className="mt-6"
                  disabled={disabled}
                  onChange={() => onToggle(card)}
                />
                <div className="min-w-0 flex-1">
                  <ProposicaoRow card={card} />
                </div>
              </label>
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
