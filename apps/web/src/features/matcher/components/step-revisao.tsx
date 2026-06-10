"use client";

import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";

import { toIdentificadorLegislativo } from "@/shared/proposicao";
import { Button } from "@/shared/ui";

import { buildRevisaoItems, posicaoLabel } from "../lib/matcher-revisao";

type StepRevisaoProps = {
  selected: ProposicaoCard[];
  posicoes: Map<number, PosicaoUsuarioMatcher>;
  faltamComputaveis: number;
  canRun: boolean;
  onEditar: (index: number) => void;
  onBack: () => void;
  onRun: () => void;
};

export function StepRevisao({
  selected,
  posicoes,
  faltamComputaveis,
  canRun,
  onEditar,
  onBack,
  onRun,
}: StepRevisaoProps) {
  const items = buildRevisaoItems(selected, posicoes);

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-base font-[680] text-ink">Revise suas posições</h2>
        <p className="mt-1 text-sm text-muted">
          Confira cada proposição antes de ver o resultado.
        </p>
      </div>

      <ul className="grid gap-0 divide-y divide-border">
        {items.map((item, index) => {
          const identificador = toIdentificadorLegislativo(item.card);
          const pendente = item.posicao === null;
          const label = posicaoLabel(item.posicao);

          return (
            <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-4" key={item.card.externalIdProposicao}>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-[650] tracking-[-0.01em] text-ink">
                  {identificador ?? "Sem identificador"}
                </p>
                {item.card.ementa ? (
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                    {item.card.ementa}
                  </p>
                ) : null}
                <p
                  aria-label={pendente ? "posição pendente" : undefined}
                  className={
                    pendente
                      ? "mt-1 text-xs font-[650] text-warning-strong underline decoration-dotted underline-offset-2"
                      : "mt-1 text-xs font-[650] text-subtle"
                  }
                >
                  {pendente ? "A decidir" : label}
                </p>
              </div>
              <Button
                aria-label={`Editar posição para ${identificador ?? "proposição"}`}
                className="shrink-0"
                onClick={() => onEditar(index)}
                variant="ghost"
              >
                Editar
              </Button>
            </li>
          );
        })}
      </ul>

      {!canRun && faltamComputaveis > 0 ? (
        <p className="rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-muted" role="status">
          Para ver o resultado, posicione-se (aprovar ou não) em pelo menos 3
          proposições. Faltam{" "}
          <strong className="font-[720] text-ink">{faltamComputaveis}</strong>.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onBack}>Voltar</Button>
        <Button disabled={!canRun} onClick={onRun} variant="primary">
          Ver resultado
        </Button>
      </div>
    </div>
  );
}
