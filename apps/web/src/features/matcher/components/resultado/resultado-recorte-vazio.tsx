import type { EscopoMatcher } from "@vota-comigo/shared-types";

import { Button, EmptyState } from "@/shared/ui";

type ResultadoRecorteVazioProps = {
  escopo: EscopoMatcher;
  onEscopoChange: (escopo: EscopoMatcher) => void;
  onLimparFiltros: () => void;
};

export function ResultadoRecorteVazio({
  escopo,
  onEscopoChange,
  onLimparFiltros,
}: ResultadoRecorteVazioProps) {
  return (
    <EmptyState
      action={
        <div className="flex flex-wrap gap-3">
          <Button onClick={onLimparFiltros} variant="primary">
            Limpar filtros
          </Button>
          {escopo === "estadual" ? (
            <Button onClick={() => onEscopoChange("nacional")}>
              Ver todos os deputados (Brasil)
            </Button>
          ) : null}
        </div>
      }
      body="Nenhum deputado passa nos filtros que você aplicou. Remova ou troque um filtro para ver mais."
      title="Nenhum deputado passa nos filtros"
    />
  );
}
