"use client";

import { Button, SearchField } from "@/shared/ui";

type FeedSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  isSearching: boolean;
  query: string;
  disabled: boolean;
};

export function FeedSearch({
  value,
  onChange,
  onSubmit,
  onClear,
  isSearching,
  query,
  disabled,
}: FeedSearchProps) {
  return (
    <div className="grid max-w-2xl gap-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="min-w-0 flex-1">
          <SearchField
            hideLabel
            id="feed-search"
            label="Buscar por identificador ou ementa"
            onChange={(event) => onChange(event.target.value)}
            placeholder="Buscar por identificador ou ementa"
            value={value}
          />
        </div>
        <Button className="shrink-0" disabled={disabled} type="submit" variant="primary">
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
