"use client";

import type {
  EscopoMatcher,
  MatcherResultado,
  PartidoDisponivel,
} from "@vota-comigo/shared-types";
import {
  Button,
  ErrorState,
  FiltrosAtivos,
  SegmentedControl,
  SkeletonRows,
} from "@/shared/ui";

import type { MatcherState, MatcherStatus } from "../../lib/matcher-state";
import {
  canOpenComparativo,
  hasComparativoDeputadoLimit,
  isComparativoSelectionMode,
  resultadoDisplay,
} from "../../lib/matcher-state";
import {
  descreverResultadoFiltrosAtivos,
  removerResultadoFiltro,
  RESULTADO_FILTROS_PADRAO,
  type ResultadoFiltroId,
  type ResultadoFiltros,
} from "../../lib/resultado-filtros";
import { DeputadoCard } from "./deputado-card";
import { ResultadoFiltrosPanel } from "./resultado-filtros-panel";
import { OrdenacaoDisclosure } from "./ordenacao-disclosure";
import { ResultadoFiltroConcordanciaVazio } from "./resultado-filtro-concordancia-vazio";
import { ResultadoRecorteVazio } from "./resultado-recorte-vazio";
import { ResultadoVazio } from "./resultado-vazio";

const ESCOPO_ITEMS = [
  { id: "estadual", label: "Meu estado" },
  { id: "nacional", label: "Brasil" },
];

type StepResultadoProps = {
  state: MatcherState;
  status: MatcherStatus;
  resultado: MatcherResultado | null;
  escopo: EscopoMatcher;
  filtros: ResultadoFiltros;
  partidos: readonly PartidoDisponivel[];
  hasMore: boolean;
  onRetry: () => void;
  onEscopoChange: (escopo: EscopoMatcher) => void;
  onApplyFiltros: (filtros: ResultadoFiltros) => void;
  onToggleFiltroConcordancia: (externalIdProposicao: number) => void;
  onLoadMore: () => void;
  onStartComparativoSelection: () => void;
  onToggleComparativoDeputado: (externalIdDeputado: number) => void;
  onCancelComparativoSelection: () => void;
  onOpenComparativo: () => void;
};

export function StepResultado({
  state,
  status,
  resultado,
  escopo,
  filtros,
  partidos,
  hasMore,
  onRetry,
  onEscopoChange,
  onApplyFiltros,
  onToggleFiltroConcordancia,
  onLoadMore,
  onStartComparativoSelection,
  onToggleComparativoDeputado,
  onCancelComparativoSelection,
  onOpenComparativo,
}: StepResultadoProps) {
  const isSelectingComparativo = isComparativoSelectionMode(state);
  const canCompare = canOpenComparativo(state);
  const hasDeputadoLimit = hasComparativoDeputadoLimit(state);
  const proposicoesElegiveis = state.selected.filter((card) => {
    const posicao = state.posicoes.get(card.externalIdProposicao);
    return posicao === "aprovar" || posicao === "rejeitar";
  });
  const proposicoesMarcadas = proposicoesElegiveis.filter((card) =>
    filtros.externalIdProposicoesFiltroConcordancia.includes(
      card.externalIdProposicao,
    ),
  );
  const hasFiltroConcordancia =
    filtros.externalIdProposicoesFiltroConcordancia.length > 0;
  const selectedComparativoCount = state.selectedComparativoDeputados.length;
  // Um texto único atende aos recortes que apenas restringem o conjunto
  // exibido; a concordância mantém o diagnóstico próprio dela.
  const hasRecorte =
    filtros.apenasEmAtividade ||
    filtros.partidos.length > 0 ||
    filtros.ocultarAmostraPequena ||
    filtros.sexo !== null;
  const display = resultadoDisplay(state);
  const comparativoControls = isSelectingComparativo ? (
    <section
      aria-label="Seleção para comparação"
      className="fixed inset-x-4 bottom-4 z-sticky grid w-auto gap-3 rounded-lg bg-white p-3 shadow-bar sm:sticky sm:inset-x-auto sm:bottom-auto sm:top-20 sm:w-full sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:border sm:border-border sm:p-4 sm:shadow-none"
    >
      <div className="grid gap-0.5">
        <p className="font-[680] text-ink">
          {selectedComparativoCount} de 3 deputados selecionados
        </p>
        <p className="text-sm text-muted">
          {hasDeputadoLimit
            ? "Limite atingido. Compare agora ou altere sua seleção."
            : selectedComparativoCount === 0
              ? "Selecione 2 ou 3 deputados na lista."
              : selectedComparativoCount === 1
                ? "Selecione pelo menos mais um deputado."
                : "Pronto para comparar lado a lado."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
        <Button
          className="h-11 min-w-0 sm:h-auto"
          onClick={onCancelComparativoSelection}
          variant="ghost"
        >
          Cancelar
        </Button>
        <Button
          className="h-11 min-w-0 sm:h-auto"
          disabled={!canCompare}
          onClick={onOpenComparativo}
          variant="primary"
        >
          Comparar deputados
        </Button>
      </div>
    </section>
  ) : (
    <header className="flex flex-col gap-4 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="grid max-w-145 gap-1">
        <h2 className="text-lg font-[680] text-ink">
          Compare os deputados
        </h2>
        <p className="text-sm text-muted">
          Escolha 2 ou 3 deputados para comparar votos e diferenças lado a
          lado.
        </p>
      </div>
      <Button
        className="h-11 w-full min-w-0 sm:h-auto sm:w-auto sm:shrink-0 sm:px-5"
        onClick={onStartComparativoSelection}
        variant="primary"
      >
        Escolher deputados para comparar
      </Button>
    </header>
  );
  const filterControls = (
    <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
      <SegmentedControl
        activeId={escopo}
        className="w-full sm:w-auto"
        itemClassName="flex-1 sm:flex-none"
        items={ESCOPO_ITEMS}
        label="Escopo dos resultados"
        onSelect={(id) => onEscopoChange(id as EscopoMatcher)}
      />
      <ResultadoFiltrosPanel
        filtros={filtros}
        onApply={onApplyFiltros}
        partidos={partidos}
        posicoes={state.posicoes}
        proposicoesElegiveis={proposicoesElegiveis}
      />
    </div>
  );
  const resultadoControls = (
    <div className="grid min-w-0 gap-3">
      {filterControls}
      <FiltrosAtivos
        ativos={descreverResultadoFiltrosAtivos(filtros)}
        onClear={() => onApplyFiltros(RESULTADO_FILTROS_PADRAO)}
        onRemove={(id: ResultadoFiltroId) =>
          onApplyFiltros(removerResultadoFiltro(filtros, id))
        }
      />
    </div>
  );

  const resultadoAnnouncement =
    display === "loading"
      ? "Atualizando lista de deputados."
      : display === "error"
        ? "Não foi possível atualizar a lista de deputados."
        : display === "empty" && hasFiltroConcordancia
          ? "Resultado atualizado: nenhum deputado votou com você em todas as propostas marcadas."
          : display === "empty" && hasRecorte
            ? "Resultado atualizado: nenhum deputado no recorte."
            : display === "empty"
              ? "Resultado atualizado: nenhum deputado encontrado."
              : resultado!.total === 1
                ? "Resultado atualizado: 1 deputado no resultado."
                : `Resultado atualizado: ${resultado!.total} deputados no resultado.`;
  const resultadoStatus = (
    <p aria-atomic="true" className="sr-only" role="status">
      {resultadoAnnouncement}
    </p>
  );

  if (display === "loading") {
    return (
      <div className="grid gap-5">
        {resultadoStatus}
        {resultadoControls}
        <SkeletonRows count={5} />
      </div>
    );
  }

  if (display === "error") {
    return (
      <div className="grid gap-5">
        {resultadoStatus}
        {resultadoControls}
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (display === "empty") {
    return (
      <div className="grid gap-4">
        {resultadoStatus}
        {resultadoControls}
        {hasFiltroConcordancia ? (
          <ResultadoFiltroConcordanciaVazio
            escopo={escopo}
            onEscopoChange={onEscopoChange}
            onToggleProposicao={onToggleFiltroConcordancia}
            posicoes={state.posicoes}
            proposicoes={proposicoesMarcadas}
          />
        ) : hasRecorte ? (
          <ResultadoRecorteVazio
            escopo={escopo}
            onEscopoChange={onEscopoChange}
            onLimparFiltros={() => onApplyFiltros(RESULTADO_FILTROS_PADRAO)}
          />
        ) : (
          <ResultadoVazio escopo={escopo} onEscopoChange={onEscopoChange} />
        )}
      </div>
    );
  }

  return (
    <div
      className={
        isSelectingComparativo
          ? "grid gap-5 pb-28 sm:pb-0"
          : "grid gap-5"
      }
    >
      {resultadoStatus}
      {resultadoControls}
      {comparativoControls}
      {hasFiltroConcordancia ? (
        <header aria-live="polite" className="grid gap-1">
          <h2 className="text-base font-[680] text-ink">
            Deputados que votaram com você nas propostas marcadas
          </h2>
          <p className="text-sm text-muted">
            Mostrando só quem votou como você em todas as propostas marcadas. O
            percentual continua considerando todas as suas respostas.
          </p>
        </header>
      ) : null}
      <OrdenacaoDisclosure />

      <ul className="grid">
        {resultado!.deputados.map((deputado) => {
          const isSelected = state.selectedComparativoDeputados.some(
            (selected) =>
              selected.externalIdDeputado === deputado.externalIdDeputado,
          );

          return (
            <DeputadoCard
              comparativoSelection={
                isSelectingComparativo
                  ? {
                      disabled: hasDeputadoLimit && !isSelected,
                      onToggle: onToggleComparativoDeputado,
                      selected: isSelected,
                    }
                  : undefined
              }
              deputado={deputado}
              key={deputado.externalIdDeputado}
              totalPosicoesComputaveis={resultado!.totalPosicoesComputaveis}
            />
          );
        })}
      </ul>

      {status === "error" ? (
        <div className="flex justify-center">
          <Button onClick={onLoadMore} variant="secondary">
            Tentar novamente
          </Button>
        </div>
      ) : hasMore ? (
        <div className="flex justify-center">
          <Button
            disabled={status === "loading"}
            onClick={onLoadMore}
            variant="secondary"
          >
            {status === "loading" ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
