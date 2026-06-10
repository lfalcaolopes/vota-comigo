"use client";

import type { EscopoMatcher, MatcherResultado } from "@vota-comigo/shared-types";

import { Button, ErrorState, SegmentedControl, SkeletonRows } from "@/shared/ui";

import type { MatcherStatus } from "../lib/matcher-state";
import { CoberturaBanner } from "./cobertura-banner";
import { DeputadoCard } from "./deputado-card";
import { OrdenacaoDisclosure } from "./ordenacao-disclosure";

const ESCOPO_ITEMS = [
  { id: "estadual", label: "Meu estado" },
  { id: "nacional", label: "Brasil" },
];

type StepResultadoProps = {
  status: MatcherStatus;
  resultado: MatcherResultado | null;
  escopo: EscopoMatcher;
  hasMore: boolean;
  onBack: () => void;
  onRetry: () => void;
  onEscopoChange: (escopo: EscopoMatcher) => void;
  onLoadMore: () => void;
};

export function StepResultado({
  status,
  resultado,
  escopo,
  hasMore,
  onBack,
  onRetry,
  onEscopoChange,
  onLoadMore,
}: StepResultadoProps) {
  const escopoControl = (
    <SegmentedControl
      activeId={escopo}
      items={ESCOPO_ITEMS}
      label="Escopo dos resultados"
      onSelect={(id) => onEscopoChange(id as EscopoMatcher)}
    />
  );

  if (status === "loading" && !resultado) {
    return (
      <div className="grid gap-5">
        {escopoControl}
        <SkeletonRows count={5} />
      </div>
    );
  }

  if (status === "error" && !resultado) {
    return (
      <div className="grid gap-5">
        {escopoControl}
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (!resultado || resultado.deputados.length === 0) {
    return (
      <div className="grid gap-4">
        {escopoControl}
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
      {escopoControl}
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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button className="justify-self-start" onClick={onBack}>
          Voltar
        </Button>

        {status === "error" ? (
          <Button onClick={onLoadMore} variant="secondary">
            Tentar novamente
          </Button>
        ) : hasMore ? (
          <Button
            disabled={status === "loading"}
            onClick={onLoadMore}
            variant="secondary"
          >
            {status === "loading" ? "Carregando…" : "Carregar mais"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
