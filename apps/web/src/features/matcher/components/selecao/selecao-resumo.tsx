import type { ProposicaoCard } from "@vota-comigo/shared-types";

import { toIdentificadorLegislativo, toTextoResumo } from "@/shared/proposicao";

const DEFAULT_LIST_CLASS =
  "-mr-1 grid max-h-96 overflow-x-hidden overflow-y-auto pr-1 lg:max-h-[min(55vh,32rem)] lg:divide-y lg:divide-border";

type SelecaoResumoProps = {
  selected: ProposicaoCard[];
  onRemove: (proposicao: ProposicaoCard) => void;
  listClassName?: string;
};

export function SelecaoResumo({
  selected,
  onRemove,
  listClassName = DEFAULT_LIST_CLASS,
}: SelecaoResumoProps) {
  if (selected.length === 0) {
    return (
      <p className="rounded-md border border-border bg-white px-4 py-3 text-sm leading-normal text-muted">
        As proposições escolhidas aparecem aqui para revisão antes de declarar
        suas posições.
      </p>
    );
  }

  return (
    <ul className={listClassName}>
      {selected.map((card) => {
        const identificador = toIdentificadorLegislativo(card);
        const label = identificador ?? "Sem identificador";
        const textoResumo = toTextoResumo(card);

        return (
          <li
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border py-3 last:border-b-0 lg:border-b-0"
            key={card.externalIdProposicao}
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-[650] tracking-[-0.01em] text-ink">
                {label}
              </p>
              {textoResumo ? (
                <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted">
                  {textoResumo}
                </p>
              ) : null}
            </div>
            <button
              aria-label={`Remover ${label} da seleção`}
              className="shrink-0 text-sm font-[650] text-muted underline decoration-border underline-offset-2 transition-colors duration-[140ms] ease-standard hover:text-ink hover:decoration-current"
              onClick={() => onRemove(card)}
              type="button"
            >
              Remover
            </button>
          </li>
        );
      })}
    </ul>
  );
}
