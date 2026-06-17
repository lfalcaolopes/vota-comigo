import type { EscopoMatcher } from "@vota-comigo/shared-types";

import { Button, EmptyState } from "@/shared/ui";

type ResultadoVazioProps = {
  escopo: EscopoMatcher;
  onBack: () => void;
  onEscopoChange: (escopo: EscopoMatcher) => void;
};

export function ResultadoVazio({ escopo, onBack, onEscopoChange }: ResultadoVazioProps) {
  if (escopo === "estadual") {
    return (
      <EmptyState
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => onEscopoChange("nacional")}>
              Ver todos os deputados (Brasil)
            </Button>
            <Button onClick={onBack}>Voltar</Button>
          </div>
        }
        body="Não há deputados federais com votos comparáveis às suas posições neste estado. Você pode expandir para ver todos os deputados do Brasil."
        title="Nenhum comparável neste estado"
      />
    );
  }

  return (
    <EmptyState
      action={<Button onClick={onBack}>Voltar</Button>}
      body="Não há deputados federais com votos comparáveis às suas posições para as proposições escolhidas."
      title="Nenhum comparável encontrado"
    />
  );
}
