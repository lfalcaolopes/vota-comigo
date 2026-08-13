import type { DeputadoCeapCategory } from "@vota-comigo/shared-types";

import { formatGastoCotaAmount } from "./gasto-cota-presentation";

export function GastoCotaComposicao({
  categories,
  totalAmountUsedCents,
}: {
  categories: readonly DeputadoCeapCategory[];
  totalAmountUsedCents: number;
}) {
  if (categories.length === 0) return null;

  return (
    <details className="mt-2 rounded-md bg-surface-muted px-3 py-2">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-[650] text-info underline decoration-info/35 underline-offset-[0.18em]">
        Ver composição de Outras despesas ({categories.length}{" "}
        {categories.length === 1 ? "categoria" : "categorias"})
      </summary>
      <ul className="grid gap-3 border-t border-border py-3">
        {categories.map((category) => (
          <li
            className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_max-content_max-content] sm:gap-4"
            key={category.externalNumSubCota}
          >
            <span className="text-ink">{category.description}</span>
            <span className="tabular-nums text-muted">
              {formatGastoCotaAmount(category.amountUsedCents)}
            </span>
            <span className="tabular-nums text-muted">
              {formatPercentualParte(
                category.amountUsedCents,
                totalAmountUsedCents,
              )}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function formatPercentualParte(
  partAmountCents: number,
  totalAmountCents: number,
) {
  if (totalAmountCents === 0) return "Participação indisponível";

  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(partAmountCents / totalAmountCents);
}
