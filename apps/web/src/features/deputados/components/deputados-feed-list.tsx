import type { DeputadoCard } from "@vota-comigo/shared-types";

import { DeputadoRow } from "@/shared/deputado";
import { Button, EmptyState, InlineMessage, SkeletonRows } from "@/shared/ui";

import type {
  DeputadoFeedDisplay,
  DeputadoFeedStatus,
} from "@/shared/deputado";

type DeputadosFeedListSelection = {
  hasLimit: boolean;
  onToggle: (externalIdDeputado: number) => void;
  selectedIds: readonly number[];
};

type DeputadosFeedListProps = {
  items: DeputadoCard[];
  total: number;
  status: DeputadoFeedStatus;
  display: DeputadoFeedDisplay;
  canLoadMore: boolean;
  onLoadMore: () => void;
  onClearTudo: () => void;
  selection?: DeputadosFeedListSelection;
};

export function DeputadosFeedList({
  items,
  total,
  status,
  display,
  canLoadMore,
  onLoadMore,
  onClearTudo,
  selection,
}: DeputadosFeedListProps) {
  if (display === "loading") {
    return <SkeletonRows count={3} />;
  }

  if (display === "empty-default") {
    return (
      <EmptyState
        body="Ainda não há deputados para exibir."
        title="Nada para exibir ainda"
      />
    );
  }

  if (display === "empty-filtered") {
    return (
      <EmptyState
        action={
          <Button onClick={onClearTudo} variant="secondary">
            Limpar busca e filtros
          </Button>
        }
        body="Nenhum deputado foi encontrado com a busca e os filtros utilizados."
        title="Nenhum deputado encontrado"
      />
    );
  }

  if (display === "error") {
    return (
      <div className="grid gap-4">
        <InlineMessage
          body="Não foi possível carregar os deputados. Tente novamente."
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
      <div className="grid min-w-0 border-t border-border">
        {items.map((card) => {
          const isSelected =
            selection?.selectedIds.includes(card.externalIdDeputado) ?? false;

          return (
            <DeputadoRow
              card={card}
              href={
                selection ? undefined : `/deputados/${card.externalIdDeputado}`
              }
              key={card.externalIdDeputado}
              selection={
                selection
                  ? {
                      disabled: selection.hasLimit && !isSelected,
                      onToggle: selection.onToggle,
                      selected: isSelected,
                    }
                  : undefined
              }
            />
          );
        })}
        {status === "loading" ? <SkeletonRows count={3} /> : null}
      </div>

      {status === "error" ? (
        <InlineMessage
          body="Não foi possível carregar os deputados. Tente novamente."
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
            {status === "loading" ? "Carregando..." : "Carregar mais"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
