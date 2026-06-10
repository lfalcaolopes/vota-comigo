"use client";

import { Button, SearchField } from "@/shared/ui";

type SelecaoSearchProps = {
  draft: string;
  query: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClear: () => void;
};

export function SelecaoSearch({
  draft,
  query,
  disabled,
  onChange,
  onSubmit,
  onClear,
}: SelecaoSearchProps) {
  const isSearching = query.length > 0;

  return (
    <div className="grid max-w-2xl gap-3">
      <form className="flex items-center gap-2" onSubmit={onSubmit}>
        <div className="min-w-0 flex-1">
          <SearchField
            hideLabel
            id="selecao-search"
            label="Buscar por identificador ou ementa"
            onChange={(event) => onChange(event.target.value)}
            placeholder="Buscar por identificador ou ementa"
            value={draft}
          />
        </div>
        <Button
          className="shrink-0"
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
            <span className="font-[650] text-ink">{query}</span>
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
