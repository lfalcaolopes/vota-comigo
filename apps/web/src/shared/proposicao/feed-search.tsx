"use client";

import { Button, SearchField } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

type FeedSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  isSearching: boolean;
  query: string;
  disabled: boolean;
  className?: string;
};

export function FeedSearch({
  className,
  value,
  onChange,
  onSubmit,
  onClear,
  isSearching,
  query,
  disabled,
}: FeedSearchProps) {
  return (
    <div className={joinClassNames("grid min-w-0 max-w-full gap-3", className)}>
      <form
        className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="min-w-0 flex-1">
          <SearchField
            className="h-11"
            hideLabel
            id="feed-search"
            label="Buscar por identificador ou ementa"
            onChange={(event) => onChange(event.target.value)}
            placeholder="Buscar por identificador ou ementa"
            value={value}
          />
        </div>
        <Button
          className="h-11 sm:shrink-0"
          disabled={disabled}
          type="submit"
          variant="primary"
        >
          Buscar
        </Button>
      </form>

      {isSearching ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <p className="text-muted">
            Resultados para{" "}
            <span className="font-[650] text-ink">&quot;{query}&quot;</span>
          </p>
          <button
            className="font-[650] text-muted underline decoration-border underline-offset-2 transition-colors duration-[140ms] ease-standard hover:text-ink hover:decoration-current"
            onClick={onClear}
            type="button"
          >
            Limpar busca
          </button>
        </div>
      ) : null}
    </div>
  );
}
