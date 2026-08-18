import type { EscopoMatcher } from "@vota-comigo/shared-types";

import { Button, EmptyState } from "@/shared/ui";

type ResultadoVazioProps = {
  escopo: EscopoMatcher;
  onEscopoChange: (escopo: EscopoMatcher) => void;
};

export function ResultadoVazio({
  escopo,
  onEscopoChange,
}: ResultadoVazioProps) {
  if (escopo === "estadual") {
    return (
      <EmptyState
        action={
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => onEscopoChange("nacional")}
            >
              Ver todos os deputados (Brasil)
            </Button>
          </div>
        }
        body="Nenhum deputado deste estado tem voto registrado nas propostas que você escolheu. Você pode abrir para o Brasil inteiro."
        title="Nenhum deputado deste estado votou nessas propostas"
      />
    );
  }

  return (
    <EmptyState
      body="Nenhum deputado tem voto registrado nas propostas que você escolheu. Volte e escolha outras propostas."
      title="Nenhum deputado votou nessas propostas"
    />
  );
}
