"use client";

import { Chip } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

import { EMPTY_SEARCH_SUGGESTIONS } from "./search-examples";

type FeedSearchSuggestionsProps = {
  className?: string;
  onSelect: (termo: string) => void;
};

export function FeedSearchSuggestions({
  className,
  onSelect,
}: FeedSearchSuggestionsProps) {
  return (
    <div
      className={joinClassNames(
        "flex min-w-0 flex-wrap items-center gap-2",
        className,
      )}
    >
      <span className="text-sm text-muted">Ou recomece por:</span>
      {EMPTY_SEARCH_SUGGESTIONS.map((termo) => (
        <Chip
          aria-label={`Recomeçar a busca por ${termo}`}
          className="hover:border-border-strong hover:bg-surface-muted"
          key={termo}
          onClick={() => onSelect(termo)}
        >
          {termo}
        </Chip>
      ))}
    </div>
  );
}
