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
  onIncluirForaDeExercicio?: () => void;
  selection?: DeputadosFeedListSelection;
  showUsoCota?: boolean;
};

export function DeputadosFeedList({
  items,
  total,
  status,
  display,
  canLoadMore,
  onLoadMore,
  onClearTudo,
  onIncluirForaDeExercicio,
  selection,
  showUsoCota,
}: DeputadosFeedListProps) {
  if (display === "loading") {
    return <SkeletonRows count={3} />;
  }

  if (display === "empty-default") {
    return (
      <EmptyState
        body="Nenhum deputado foi carregado. Tente recarregar a página."
        title="Nenhum deputado disponível"
      />
    );
  }

  if (display === "empty-filtered") {
    return onIncluirForaDeExercicio ? (
      <EmptyState
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={onIncluirForaDeExercicio} variant="primary">
              Incluir quem não está em exercício
            </Button>
            <Button onClick={onClearTudo} variant="secondary">
              Limpar busca e filtros
            </Button>
          </div>
        }
        body="Nenhum deputado em exercício combina com a busca e os filtros atuais. Você pode incluir quem já deixou o cargo."
        title="Nenhum deputado encontrado"
      />
    ) : (
      <EmptyState
        action={
          <Button onClick={onClearTudo} variant="secondary">
            Limpar busca e filtros
          </Button>
        }
        body="Nenhum deputado combina com a busca e os filtros atuais. Tente remover um filtro ou buscar por outro nome."
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
              showUsoCota={showUsoCota}
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
