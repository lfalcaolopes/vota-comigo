import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import type { ReactNode } from "react";

import { joinClassNames } from "../ui/utils";
import { ProposicaoResumo } from "./proposicao-resumo";
import { toIdentificadorLegislativo, toTextoResumo } from "./presentation";

type ProposicoesSelecionadasListProps = {
  ariaLabel?: string;
  className?: string;
  highlightIndex?: number;
  posicoes: ReadonlyMap<number, PosicaoUsuarioMatcher>;
  proposicoes: readonly ProposicaoCard[];
  renderAction: (
    proposicao: ProposicaoCard,
    index: number,
    identificador: string,
  ) => ReactNode;
};

export function ProposicoesSelecionadasList({
  ariaLabel,
  className,
  highlightIndex,
  posicoes,
  proposicoes,
  renderAction,
}: ProposicoesSelecionadasListProps) {
  return (
    <ul
      aria-label={ariaLabel}
      className={joinClassNames(
        "grid divide-y divide-border overflow-x-hidden",
        className,
      )}
    >
      {proposicoes.map((proposicao, index) => {
        const identificador = toIdentificadorLegislativo(proposicao);
        const textoResumo = toTextoResumo(proposicao);
        const posicao = posicoes.get(proposicao.externalIdProposicao) ?? null;
        const pendente = posicao === null;

        return (
          <li
            className={joinClassNames(
              "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-4",
              index === highlightIndex && "rounded-md bg-surface-muted px-3",
            )}
            key={proposicao.externalIdProposicao}
          >
            <div className="grid min-w-0 gap-0.5">
              <p className="truncate font-mono text-sm font-[650] tracking-[-0.01em] text-ink">
                {identificador ?? "Sem identificador"}
              </p>
              {textoResumo ? (
                <ProposicaoResumo
                  identificador={identificador ?? "proposição"}
                  texto={textoResumo}
                />
              ) : null}
              <p
                aria-label={pendente ? "posição pendente" : undefined}
                className={
                  pendente
                    ? "mt-1 text-xs font-[650] text-warning-strong underline decoration-dotted underline-offset-2"
                    : "mt-1 text-xs font-[650] text-subtle"
                }
              >
                {toPosicaoUsuarioLabel(posicao)}
              </p>
            </div>
            {renderAction(
              proposicao,
              index,
              identificador ?? "Sem identificador",
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function toPosicaoUsuarioLabel(
  posicao: PosicaoUsuarioMatcher | null,
): string {
  if (posicao === null) return "A decidir";
  if (posicao === "aprovar") return "Deveria ser aprovada";
  if (posicao === "rejeitar") return "Não deveria ser aprovada";
  return "Não sei";
}
