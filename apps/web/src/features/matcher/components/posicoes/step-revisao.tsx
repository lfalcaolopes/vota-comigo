"use client";

import { MIN_POSICOES_COMPUTAVEIS } from "@vota-comigo/shared-types";
import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";

import { toIdentificadorLegislativo } from "@/shared/proposicao";
import { Button } from "@/shared/ui";

import { buildRevisaoItems, posicaoLabel } from "../../lib/matcher-revisao";

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
  const items = buildRevisaoItems(selected, posicoes);

  return (
    <div className="grid min-w-0 gap-6">
      <div>
        <h2 className="text-base font-[680] text-ink">Suas posições</h2>
        <p className="mt-1 text-sm text-muted">
          Confira as respostas que serão comparadas com os votos dos deputados.
        </p>
      </div>

      <ul className="-mr-1 grid max-h-96 divide-y divide-border overflow-x-hidden overflow-y-auto pr-1 lg:max-h-[min(55vh,32rem)]">
        {items.map((item, index) => {
          const identificador = toIdentificadorLegislativo(item.card);
          const pendente = item.posicao === null;
          const label = posicaoLabel(item.posicao);

          return (
            <li
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-4 ${index === highlightIndex ? "rounded-md bg-surface-muted px-3" : ""}`}
              key={item.card.externalIdProposicao}
            >
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

      {!canRun && faltamRespostas > 0 ? (
        <p className="rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-muted" role="status">
          Para ver o resultado, responda Sim, Não ou Não sei em todas as
          proposições selecionadas. Faltam{" "}
          <strong className="font-[720] text-ink">{faltamRespostas}</strong>.
        </p>
      ) : null}

      {!canRun && faltamRespostas === 0 && faltamComputaveis > 0 ? (
        <p className="rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-muted" role="status">
          Respostas marcadas como Não sei ficam fora do cálculo. Para ver o resultado,
          responda Sim ou Não em pelo menos {MIN_POSICOES_COMPUTAVEIS}{" "}
          proposições. Faltam{" "}
          <strong className="font-[720] text-ink">{faltamComputaveis}</strong>.
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
