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
      body="Nenhum deputado comparável atende aos filtros aplicados. Remova ou altere um filtro para ver mais deputados."
      title="Nenhum deputado no recorte"
    />
  );
}
