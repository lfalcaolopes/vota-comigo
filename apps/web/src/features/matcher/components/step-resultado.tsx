"use client";

import type { MatcherResultado } from "@vota-comigo/shared-types";

import { Button, ErrorState, SkeletonRows } from "@/shared/ui";

import type { MatcherStatus } from "../lib/matcher-state";
import { CoberturaBanner } from "./cobertura-banner";
import { DeputadoCard } from "./deputado-card";
import { OrdenacaoDisclosure } from "./ordenacao-disclosure";

type StepResultadoProps = {
  status: MatcherStatus;
  resultado: MatcherResultado | null;
  onBack: () => void;
  onRetry: () => void;
};

export function StepResultado({
  status,
  resultado,
  onBack,
  onRetry,
}: StepResultadoProps) {
  if (status === "loading") {
    return <SkeletonRows count={5} />;
  }

  if (status === "error") {
    return <ErrorState onRetry={onRetry} />;
  }

  if (!resultado || resultado.deputados.length === 0) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted">
          Nenhum deputado comparável para as proposições escolhidas.
        </p>
        <Button className="justify-self-start" onClick={onBack}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <CoberturaBanner />
      <OrdenacaoDisclosure />

      <ul className="grid">
        {resultado.deputados.map((deputado) => (
          <DeputadoCard
            deputado={deputado}
            key={deputado.externalIdDeputado}
            totalPosicoesComputaveis={resultado.totalPosicoesComputaveis}
          />
        ))}
      </ul>

      <Button className="justify-self-start" onClick={onBack}>
        Voltar
      </Button>
    </div>
  );
}
