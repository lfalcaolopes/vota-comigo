"use client";

import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";

import { ProposicoesSelecionadasList } from "@/shared/proposicao";
import { Button } from "@/shared/ui";

import { toPosicoesPendencia } from "../../lib/posicoes-pendencia";

type StepRevisaoProps = {
  selected: ProposicaoCard[];
  posicoes: Map<number, PosicaoUsuarioMatcher>;
  faltamRespostas: number;
  faltamComputaveis: number;
  canRun: boolean;
  highlightIndex: number;
  onEditar: (index: number) => void;
  onBack: () => void;
  onRun: () => void;
};

export function StepRevisao({
  selected,
  posicoes,
  faltamRespostas,
  faltamComputaveis,
  canRun,
  highlightIndex,
  onEditar,
  onBack,
  onRun,
}: StepRevisaoProps) {
  const pendencia = toPosicoesPendencia({
    faltamComputaveis,
    faltamRespostas,
  });

  return (
    <div className="grid min-w-0 gap-6">
      <div>
        <h2 className="text-base font-[680] text-ink">Suas posições</h2>
        <p className="mt-1 text-sm text-muted">
          Confira as respostas que serão comparadas com os votos dos deputados.
        </p>
      </div>

      <ProposicoesSelecionadasList
        ariaLabel="Propostas selecionadas"
        className="-mr-1 max-h-96 overflow-y-auto pr-1 lg:max-h-[min(55vh,32rem)]"
        highlightIndex={highlightIndex}
        posicoes={posicoes}
        proposicoes={selected}
        renderAction={(_proposicao, index, identificador) => (
          <Button
            aria-label={`Editar posição para ${identificador}`}
            className="shrink-0"
            onClick={() => onEditar(index)}
            variant="ghost"
          >
            Editar
          </Button>
        )}
      />

      {!canRun && pendencia ? (
        <p
          className="rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-muted"
          role="status"
        >
          {pendencia.instrucao}{" "}
          <strong className="font-[720] text-ink">{pendencia.contagem}</strong>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button className="lg:hidden" onClick={onBack}>
          Voltar
        </Button>
        <Button disabled={!canRun} onClick={onRun} variant="primary">
          Ver resultado
        </Button>
      </div>
    </div>
  );
}
