"use client";

import type { EscopoMatcher, MatcherResultado } from "@vota-comigo/shared-types";

import { Button, ErrorState, SegmentedControl, SkeletonRows } from "@/shared/ui";

import type { MatcherState, MatcherStatus } from "../lib/matcher-state";
import { isSemBomMatch, resultadoDisplay, shouldSuggestNacional } from "../lib/matcher-state";
import { CoberturaBanner } from "./cobertura-banner";
import { DeputadoCard } from "./deputado-card";
import { EscopoNacionalBanner } from "./escopo-nacional-banner";
import { OrdenacaoDisclosure } from "./ordenacao-disclosure";
import { ResultadoVazio } from "./resultado-vazio";
import { SemBomMatchBanner } from "./sem-bom-match-banner";

const ESCOPO_ITEMS = [
  { id: "estadual", label: "Meu estado" },
  { id: "nacional", label: "Brasil" },
];

type StepResultadoProps = {
  state: MatcherState;
  status: MatcherStatus;
  resultado: MatcherResultado | null;
  escopo: EscopoMatcher;
  hasMore: boolean;
  onBack: () => void;
  onRetry: () => void;
  onEscopoChange: (escopo: EscopoMatcher) => void;
  onLoadMore: () => void;
  onOpenDetalhe: (externalIdDeputado: number) => void;
};

export function StepResultado({
  state,
  status,
  resultado,
  escopo,
  hasMore,
  onBack,
  onRetry,
  onEscopoChange,
  onLoadMore,
  onOpenDetalhe,
}: StepResultadoProps) {
  const escopoControl = (
    <SegmentedControl
      activeId={escopo}
      items={ESCOPO_ITEMS}
      label="Escopo dos resultados"
      onSelect={(id) => onEscopoChange(id as EscopoMatcher)}
    />
  );

  const display = resultadoDisplay(state);

  if (display === "loading") {
    return (
      <div className="grid gap-5">
        {escopoControl}
        <SkeletonRows count={5} />
      </div>
    );
  }

  if (display === "error") {
    return (
      <div className="grid gap-5">
        {escopoControl}
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (display === "empty") {
    return (
      <div className="grid gap-4">
        {escopoControl}
        <ResultadoVazio escopo={escopo} onBack={onBack} onEscopoChange={onEscopoChange} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {escopoControl}
      <CoberturaBanner />
      {isSemBomMatch(resultado) && <SemBomMatchBanner />}
      {shouldSuggestNacional(state) && (
        <EscopoNacionalBanner onEscopoChange={onEscopoChange} />
      )}
      <OrdenacaoDisclosure />

      <ul className="grid">
        {resultado!.deputados.map((deputado) => (
          <DeputadoCard
            deputado={deputado}
            key={deputado.externalIdDeputado}
            onOpen={onOpenDetalhe}
            totalPosicoesComputaveis={resultado!.totalPosicoesComputaveis}
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
